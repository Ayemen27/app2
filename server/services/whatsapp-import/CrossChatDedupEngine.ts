import { db } from "../../db.js";
import { waExtractionCandidates, waDedupKeys } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { computeFingerprint, computeCrossMatchKey, formatDateForFingerprint, getDateWindow, type FingerprintComponents } from './FingerprintEngine.js';
import { buildTransactionDateMap } from './DateResolver.js';

export interface DedupResult {
  candidateId: number;
  isDuplicate: boolean;
  duplicateOfCandidateId: number | null;
  fingerprintHash: string;
  reason: string;
}

export async function deduplicateCandidates(batchId: number): Promise<DedupResult[]> {
  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.batchId, batchId));

  const dateMap = await buildTransactionDateMap(candidates.map(c => c.id));

  const results: DedupResult[] = [];

  for (const candidate of candidates) {
    const amount = parseFloat(candidate.amount || '0');
    const dateStr = dateMap.get(candidate.id)
      || (candidate.createdAt ? formatDateForFingerprint(new Date(candidate.createdAt)) : '');

    let transferNumber: string | undefined;
    if (candidate.candidateType === 'transfer' && candidate.description) {
      const numMatch = candidate.description.match(/\d{6,}/);
      if (numMatch) transferNumber = numMatch[0];
    }

    const components: FingerprintComponents = {
      amount,
      date: dateStr,
      transferNumber,
      description: candidate.description || undefined,
      candidateType: candidate.candidateType,
    };

    const fingerprintHash = computeFingerprint(components);

    const existingKey = await db.select()
      .from(waDedupKeys)
      .where(eq(waDedupKeys.fingerprintHash, fingerprintHash))
      .limit(1);

    if (existingKey.length > 0 && existingKey[0].candidateId !== candidate.id) {
      results.push({
        candidateId: candidate.id,
        isDuplicate: true,
        duplicateOfCandidateId: existingKey[0].candidateId,
        fingerprintHash,
        reason: `Duplicate of candidate #${existingKey[0].candidateId} (fingerprint match)`,
      });
    } else if (existingKey.length === 0) {
      await db.insert(waDedupKeys).values({
        candidateId: candidate.id,
        fingerprintHash,
        fingerprintComponentsJson: components,
      });

      results.push({
        candidateId: candidate.id,
        isDuplicate: false,
        duplicateOfCandidateId: null,
        fingerprintHash,
        reason: 'unique candidate',
      });
    } else {
      results.push({
        candidateId: candidate.id,
        isDuplicate: false,
        duplicateOfCandidateId: null,
        fingerprintHash,
        reason: 'already registered',
      });
    }
  }

  return results;
}

export async function crossChatDedup(
  batchId: number,
  otherBatchIds: number[]
): Promise<DedupResult[]> {
  if (otherBatchIds.length === 0) return [];

  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.batchId, batchId));

  const otherCandidates = await db.select()
    .from(waExtractionCandidates)
    .where(inArray(waExtractionCandidates.batchId, otherBatchIds));

  const allIds = [...candidates.map(c => c.id), ...otherCandidates.map(c => c.id)];
  const dateMap = await buildTransactionDateMap(allIds);

  const results: DedupResult[] = [];
  const alreadyFlagged = new Set<number>();

  for (const candidate of candidates) {
    if (alreadyFlagged.has(candidate.id)) continue;

    const amount = parseFloat(candidate.amount || '0');
    const dateStr = dateMap.get(candidate.id)
      || (candidate.createdAt ? formatDateForFingerprint(new Date(candidate.createdAt)) : '');

    let transferNumber: string | undefined;
    if (candidate.candidateType === 'transfer' && candidate.description) {
      const numMatch = candidate.description.match(/\d{6,}/);
      if (numMatch) transferNumber = numMatch[0];
    }

    if (transferNumber) {
      const crossMatch = otherCandidates.find(other =>
        other.candidateType === 'transfer' &&
        other.description?.includes(transferNumber!)
      );

      if (crossMatch) {
        alreadyFlagged.add(candidate.id);
        results.push({
          candidateId: candidate.id,
          isDuplicate: true,
          duplicateOfCandidateId: crossMatch.id,
          fingerprintHash: computeFingerprint({
            amount, date: dateStr, transferNumber, candidateType: candidate.candidateType,
          }),
          reason: `Cross-chat duplicate: same transfer number ${transferNumber} in batch #${crossMatch.batchId}`,
        });
        continue;
      }
    }

    if (amount > 0 && dateStr) {
      const { start, end } = getDateWindow(dateStr, 1);
      const startDate = new Date(start);
      const endDate = new Date(end);

      const amountMatch = otherCandidates.find(other => {
        const otherAmount = parseFloat(other.amount || '0');
        if (Math.abs(otherAmount - amount) > 0.01) return false;

        const otherDateStr = dateMap.get(other.id);
        const otherDate = otherDateStr ? new Date(otherDateStr) : null;
        if (!otherDate) return false;

        return otherDate >= startDate && otherDate <= endDate;
      });

      if (amountMatch) {
        alreadyFlagged.add(candidate.id);
        const crossKey = computeCrossMatchKey(amount, dateStr);
        results.push({
          candidateId: candidate.id,
          isDuplicate: true,
          duplicateOfCandidateId: amountMatch.id,
          fingerprintHash: crossKey,
          reason: `Cross-chat duplicate: amount ${amount} + date ±1 day match with candidate #${amountMatch.id} in batch #${amountMatch.batchId}`,
        });
      }
    }
  }

  return results;
}
