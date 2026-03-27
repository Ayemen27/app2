import { db } from "../../db.js";
import {
  waExtractionCandidates,
  waCanonicalTransactions,
  waVerificationQueue,
  waProjectHypotheses,
  waRawMessages,
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { matchCandidate, type MatchResult } from './HistoricalMatcher.js';
import { deduplicateCandidates, crossChatDedup, type DedupResult } from './CrossChatDedupEngine.js';
import { reconcileAllCustodians, type CustodianStatement } from './CustodianReconciliation.js';
import { detectCarpenterAggregation, reconcileLoans, type CarpenterAggregationFlag, type LoanReconciliationResult } from './SpecialReconcilers.js';
import { formatDateForFingerprint } from './FingerprintEngine.js';
import { buildTransactionDateMap } from './DateResolver.js';

export type Priority = 'P1_critical' | 'P2_high' | 'P3_medium' | 'P4_low';

export interface ReconciliationReport {
  batchId: number;
  totalCandidates: number;
  totalAmount: number;
  matchedToExisting: number;
  matchedAmount: number;
  newEntries: number;
  newEntryAmount: number;
  conflicts: number;
  conflictAmount: number;
  duplicates: number;
  duplicateAmount: number;
  excludedNonTransactions: number;
  unresolvedDelta: number;
  tolerancePercent: number;
  withinTolerance: boolean;
  byCategory: Record<string, { count: number; amount: number }>;
  byProject: Record<string, { count: number; amount: number }>;
  byMatchStatus: Record<string, number>;
  custodianStatements: CustodianStatement[];
  carpenterFlags: CarpenterAggregationFlag[];
  loanResults: LoanReconciliationResult[];
  verificationQueueSize: number;
}

export async function runReconciliation(
  batchId: number,
  otherBatchIds: number[] = [],
  tolerancePercent: number = 1
): Promise<ReconciliationReport> {
  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.batchId, batchId));

  if (candidates.length === 0) {
    throw new Error(`No candidates found for batch ${batchId}. Run extraction first.`);
  }

  const dedupResults = await deduplicateCandidates(batchId);

  let crossDedupResults: DedupResult[] = [];
  if (otherBatchIds.length > 0) {
    crossDedupResults = await crossChatDedup(batchId, otherBatchIds);
  }

  const allDedups = [...dedupResults, ...crossDedupResults];
  const duplicateCandidateIds = new Set(
    allDedups.filter(d => d.isDuplicate).map(d => d.candidateId)
  );

  const transactionDateMap = await buildTransactionDateMap(candidates.map(c => c.id));

  const projectHypotheses = await db.select()
    .from(waProjectHypotheses)
    .where(sql`candidate_id IN (SELECT id FROM wa_extraction_candidates WHERE batch_id = ${batchId})`);

  const projectMap = new Map<number, { projectId: string; confidence: string | null }>();
  for (const hyp of projectHypotheses) {
    const existing = projectMap.get(hyp.candidateId);
    if (!existing || parseFloat(hyp.confidence || '0') > parseFloat(existing.confidence || '0')) {
      projectMap.set(hyp.candidateId, { projectId: hyp.projectId, confidence: hyp.confidence });
    }
  }

  let totalAmount = 0;
  let matchedToExisting = 0;
  let matchedAmount = 0;
  let newEntries = 0;
  let newEntryAmount = 0;
  let conflicts = 0;
  let conflictAmount = 0;
  let duplicates = 0;
  let duplicateAmount = 0;

  const byCategory: Record<string, { count: number; amount: number }> = {};
  const byProject: Record<string, { count: number; amount: number }> = {};
  const byMatchStatus: Record<string, number> = {};

  const verificationItems: Array<{
    candidateId: number;
    reason: string;
    priority: Priority;
  }> = [];

  for (const candidate of candidates) {
    const amount = parseFloat(candidate.amount || '0');
    totalAmount += amount;

    const cat = candidate.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, amount: 0 };
    byCategory[cat].count++;
    byCategory[cat].amount += amount;

    const projHyp = projectMap.get(candidate.id);
    const projId = projHyp?.projectId || 'unknown';
    if (!byProject[projId]) byProject[projId] = { count: 0, amount: 0 };
    byProject[projId].count++;
    byProject[projId].amount += amount;

    if (duplicateCandidateIds.has(candidate.id)) {
      duplicates++;
      duplicateAmount += amount;
      byMatchStatus['duplicate'] = (byMatchStatus['duplicate'] || 0) + 1;

      await db.update(waExtractionCandidates)
        .set({ matchStatus: 'exact_match' })
        .where(eq(waExtractionCandidates.id, candidate.id));
      continue;
    }

    const dateStr = transactionDateMap.get(candidate.id)
      || (candidate.createdAt ? formatDateForFingerprint(new Date(candidate.createdAt)) : new Date().toISOString().split('T')[0]);

    let transferNumber: string | null = null;
    if (candidate.candidateType === 'transfer' && candidate.description) {
      const numMatch = candidate.description.match(/\d{6,}/);
      if (numMatch) transferNumber = numMatch[0];
    }

    const matchResult = await matchCandidate(
      amount,
      candidate.candidateType,
      candidate.category,
      transferNumber,
      null,
      candidate.description || '',
      dateStr,
      projHyp?.projectId || null
    );

    await db.update(waExtractionCandidates)
      .set({ matchStatus: matchResult.matchStatus })
      .where(eq(waExtractionCandidates.id, candidate.id));

    byMatchStatus[matchResult.matchStatus] = (byMatchStatus[matchResult.matchStatus] || 0) + 1;

    switch (matchResult.matchStatus) {
      case 'exact_match':
        matchedToExisting++;
        matchedAmount += amount;
        break;
      case 'near_match':
        matchedToExisting++;
        matchedAmount += amount;
        verificationItems.push({
          candidateId: candidate.id,
          reason: matchResult.matchReason,
          priority: 'P2_high',
        });
        break;
      case 'conflict':
        conflicts++;
        conflictAmount += amount;
        verificationItems.push({
          candidateId: candidate.id,
          reason: matchResult.matchReason,
          priority: amount > 500000 ? 'P1_critical' : 'P2_high',
        });
        break;
      case 'new_entry':
        newEntries++;
        newEntryAmount += amount;
        break;
    }

    const confidence = parseFloat(candidate.confidence || '0');
    if (confidence < 0.85 && matchResult.matchStatus === 'new_entry') {
      verificationItems.push({
        candidateId: candidate.id,
        reason: `Low confidence: ${confidence}`,
        priority: 'P3_medium',
      });
    }

    if (amount > 100000) {
      verificationItems.push({
        candidateId: candidate.id,
        reason: `High value: ${amount} YER`,
        priority: 'P2_high',
      });
    }

    if (['loan', 'personal_account', 'settlement'].includes(candidate.candidateType)) {
      verificationItems.push({
        candidateId: candidate.id,
        reason: `Special type: ${candidate.candidateType}`,
        priority: 'P2_high',
      });
    }

    const projConfidence = parseFloat(projHyp?.confidence || '0');
    if (projConfidence > 0 && projConfidence < 0.80) {
      verificationItems.push({
        candidateId: candidate.id,
        reason: `Low project confidence: ${projConfidence}`,
        priority: 'P3_medium',
      });
    }
  }

  const carpenterFlags: CarpenterAggregationFlag[] = [];
  for (const candidate of candidates) {
    const projHyp = projectMap.get(candidate.id);
    const flag = detectCarpenterAggregation(
      candidate.id,
      projHyp?.projectId || null,
      candidate.description,
      candidate.category
    );
    if (flag) {
      carpenterFlags.push(flag);
      verificationItems.push({
        candidateId: candidate.id,
        reason: flag.reason,
        priority: 'P2_high',
      });
    }
  }

  const loanResults = reconcileLoans(
    candidates.map(c => ({
      id: c.id,
      candidateType: c.candidateType,
      amount: c.amount,
      description: c.description,
    }))
  );

  for (const lr of loanResults) {
    if (!lr.isBalanced) {
      verificationItems.push({
        candidateId: lr.candidateId,
        reason: lr.reason,
        priority: 'P2_high',
      });
    }
  }

  const uniqueVerifications = new Map<number, { reason: string; priority: Priority }>();
  for (const item of verificationItems) {
    const existing = uniqueVerifications.get(item.candidateId);
    if (!existing || priorityRank(item.priority) < priorityRank(existing.priority)) {
      const combinedReason = existing
        ? `${existing.reason}; ${item.reason}`
        : item.reason;
      uniqueVerifications.set(item.candidateId, {
        reason: combinedReason,
        priority: priorityRank(item.priority) < priorityRank(existing?.priority || 'P4_low')
          ? item.priority
          : (existing?.priority || 'P4_low'),
      });
    }
  }

  for (const [candidateId, { reason, priority }] of uniqueVerifications) {
    const existingVQ = await db.select({ id: waVerificationQueue.id })
      .from(waVerificationQueue)
      .where(eq(waVerificationQueue.candidateId, candidateId))
      .limit(1);

    if (existingVQ.length > 0) {
      await db.update(waVerificationQueue)
        .set({ reason, priority })
        .where(eq(waVerificationQueue.candidateId, candidateId));
    } else {
      await db.insert(waVerificationQueue).values({
        candidateId,
        reason,
        priority,
      });
    }
  }

  let custodianStatements: CustodianStatement[] = [];
  try {
    custodianStatements = await reconcileAllCustodians();
  } catch (e) {
    console.error('[Reconciliation] Custodian reconciliation failed:', e);
  }

  const unresolvedDelta = totalAmount - matchedAmount - newEntryAmount - duplicateAmount - conflictAmount;
  const withinTolerance = Math.abs(unresolvedDelta) <= (totalAmount * tolerancePercent / 100);

  return {
    batchId,
    totalCandidates: candidates.length,
    totalAmount,
    matchedToExisting,
    matchedAmount,
    newEntries,
    newEntryAmount,
    conflicts,
    conflictAmount,
    duplicates,
    duplicateAmount,
    excludedNonTransactions: 0,
    unresolvedDelta,
    tolerancePercent,
    withinTolerance,
    byCategory,
    byProject,
    byMatchStatus,
    custodianStatements,
    carpenterFlags,
    loanResults,
    verificationQueueSize: uniqueVerifications.size,
  };
}

function priorityRank(p: Priority | string): number {
  switch (p) {
    case 'P1_critical': return 1;
    case 'P2_high': return 2;
    case 'P3_medium': return 3;
    case 'P4_low': return 4;
    default: return 5;
  }
}
