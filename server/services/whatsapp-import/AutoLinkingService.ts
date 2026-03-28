import { db } from "../../db.js";
import { pool } from "../../db.js";
import {
  waExtractionCandidates,
  waEntityAliases,
  waRawMessages,
  waProjectHypotheses,
  workers,
  suppliers,
  projects,
} from "@shared/schema";
import { eq, and, sql, inArray, isNull } from "drizzle-orm";
import { normalizeForMatching } from './NameExtractionService.js';
import { normalizeArabicText } from './ArabicAmountParser.js';
import { safeParseNum } from '../../utils/safe-numbers.js';

export type AutoLinkType = 'worker' | 'supplier' | 'project' | 'erp_record';
export type AutoLinkStatus = 'pending' | 'accepted' | 'rejected';

export interface AutoLinkEvidence {
  method: string;
  detail: string;
}

export interface AutoLinkResult {
  id: number;
  candidateId: number;
  sourceText: string;
  sourceType: string;
  linkedEntityId: string;
  linkedEntityName: string;
  linkedEntityTable: string;
  linkType: AutoLinkType;
  confidence: number;
  matchReason: string;
  evidence: AutoLinkEvidence[];
  status: AutoLinkStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface AutoLinkSummary {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

interface CandidateForLinking {
  id: number;
  batchId: number;
  sourceMessageId: number | null;
  amount: string | null;
  description: string | null;
  candidateType: string;
  category: string | null;
  confidence: string | null;
}

interface WorkerRecord {
  id: string;
  name: string;
  normalizedName: string;
}

interface SupplierRecord {
  id: string;
  name: string;
  normalizedName: string;
}

let autoLinkIdCounter = 0;
const autoLinkStore = new Map<string, AutoLinkResult[]>();

function getStoreKey(batchId: number): string {
  return `batch_${batchId}`;
}

function arabicNameSimilarity(a: string, b: string): number {
  const na = normalizeArabicText(a).replace(/\s+/g, '');
  const nb = normalizeArabicText(b).replace(/\s+/g, '');
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

export class AutoLinkingService {
  async generateAutoLinks(batchId: number): Promise<AutoLinkResult[]> {
    const candidates = await db.select()
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.batchId, batchId));

    if (candidates.length === 0) {
      return [];
    }

    const messageIds = candidates
      .map((c: { sourceMessageId: number | null }) => c.sourceMessageId)
      .filter((id: number | null): id is number => id !== null);

    const msgSenderMap = new Map<number, string>();
    const msgTextMap = new Map<number, string>();
    if (messageIds.length > 0) {
      const rawMsgs = await db.select({
        id: waRawMessages.id,
        sender: waRawMessages.sender,
        messageText: waRawMessages.messageText,
      })
        .from(waRawMessages)
        .where(inArray(waRawMessages.id, messageIds));
      for (const msg of rawMsgs) {
        msgSenderMap.set(msg.id, msg.sender);
        if (msg.messageText) msgTextMap.set(msg.id, msg.messageText);
      }
    }

    const allWorkers = await db.select({ id: workers.id, name: workers.name })
      .from(workers)
      .where(eq(workers.is_active, true));
    const workerRecords: WorkerRecord[] = allWorkers.map((w: { id: string; name: string }) => ({
      id: w.id,
      name: w.name,
      normalizedName: normalizeForMatching(w.name),
    }));

    const allSuppliers = await db.select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.is_active, true));
    const supplierRecords: SupplierRecord[] = allSuppliers.map((s: { id: string; name: string }) => ({
      id: s.id,
      name: s.name,
      normalizedName: normalizeForMatching(s.name),
    }));

    const entityAliases = await db.select()
      .from(waEntityAliases)
      .where(and(
        eq(waEntityAliases.isVerified, true),
        eq(waEntityAliases.isActive, true),
      ));
    const aliasMap = new Map<string, { entityId: string; entityTable: string; aliasName: string }>();
    for (const alias of entityAliases) {
      if (alias.canonicalEntityId) {
        aliasMap.set(alias.aliasNameNormalized, {
          entityId: alias.canonicalEntityId,
          entityTable: alias.entityTable || 'workers',
          aliasName: alias.aliasName,
        });
      }
    }

    const projectHypotheses = await db.select()
      .from(waProjectHypotheses)
      .where(sql`candidate_id IN (SELECT id FROM wa_extraction_candidates WHERE batch_id = ${batchId})`);

    const projHypMap = new Map<number, Array<{ projectId: string; confidence: string | null; method: string | null }>>();
    for (const hyp of projectHypotheses) {
      const existing = projHypMap.get(hyp.candidateId) || [];
      existing.push({ projectId: hyp.projectId, confidence: hyp.confidence, method: hyp.inferenceMethod });
      projHypMap.set(hyp.candidateId, existing);
    }

    const allProjects = await db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.is_active, true));
    const projectNameMap = new Map<string, string>();
    for (const p of allProjects) {
      projectNameMap.set(p.id, p.name);
    }

    const results: AutoLinkResult[] = [];

    for (const candidate of candidates) {
      const senderName = candidate.sourceMessageId ? msgSenderMap.get(candidate.sourceMessageId) || null : null;
      const messageText = candidate.sourceMessageId ? msgTextMap.get(candidate.sourceMessageId) || '' : '';
      const description = candidate.description || '';

      const namesInText = this.extractNamesFromDescription(description, senderName);

      for (const nameInfo of namesInText) {
        const normalized = normalizeForMatching(nameInfo.name);
        if (normalized.length < 2) continue;

        const aliasMatch = aliasMap.get(normalized);
        if (aliasMatch) {
          const entityName = await this.resolveEntityName(aliasMatch.entityId, aliasMatch.entityTable);
          results.push({
            id: ++autoLinkIdCounter,
            candidateId: candidate.id,
            sourceText: nameInfo.name,
            sourceType: nameInfo.source,
            linkedEntityId: aliasMatch.entityId,
            linkedEntityName: entityName || aliasMatch.aliasName,
            linkedEntityTable: aliasMatch.entityTable,
            linkType: aliasMatch.entityTable === 'suppliers' ? 'supplier' : 'worker',
            confidence: 0.92,
            matchReason: 'Verified alias exact match',
            evidence: [
              { method: 'alias_match', detail: `Alias "${nameInfo.name}" verified and linked to entity` },
            ],
            status: 'pending',
            verifiedBy: null,
            verifiedAt: null,
            createdAt: new Date().toISOString(),
          });
          continue;
        }

        const workerMatch = this.findBestMatch(normalized, nameInfo.name, workerRecords);
        if (workerMatch) {
          results.push({
            id: ++autoLinkIdCounter,
            candidateId: candidate.id,
            sourceText: nameInfo.name,
            sourceType: nameInfo.source,
            linkedEntityId: workerMatch.record.id,
            linkedEntityName: workerMatch.record.name,
            linkedEntityTable: 'workers',
            linkType: 'worker',
            confidence: workerMatch.confidence,
            matchReason: workerMatch.reason,
            evidence: workerMatch.evidence,
            status: 'pending',
            verifiedBy: null,
            verifiedAt: null,
            createdAt: new Date().toISOString(),
          });
          continue;
        }

        const supplierMatch = this.findBestMatch(normalized, nameInfo.name, supplierRecords);
        if (supplierMatch) {
          results.push({
            id: ++autoLinkIdCounter,
            candidateId: candidate.id,
            sourceText: nameInfo.name,
            sourceType: nameInfo.source,
            linkedEntityId: supplierMatch.record.id,
            linkedEntityName: supplierMatch.record.name,
            linkedEntityTable: 'suppliers',
            linkType: 'supplier',
            confidence: supplierMatch.confidence,
            matchReason: supplierMatch.reason,
            evidence: supplierMatch.evidence,
            status: 'pending',
            verifiedBy: null,
            verifiedAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const projHyps = projHypMap.get(candidate.id);
      if (projHyps && projHyps.length > 0) {
        const bestHyp = projHyps.reduce((best, curr) =>
          safeParseNum(curr.confidence) > safeParseNum(best.confidence) ? curr : best
        );
        const projConf = safeParseNum(bestHyp.confidence);
        if (projConf > 0.5) {
          const projName = projectNameMap.get(bestHyp.projectId);
          if (projName) {
            results.push({
              id: ++autoLinkIdCounter,
              candidateId: candidate.id,
              sourceText: description.substring(0, 100),
              sourceType: 'project_inference',
              linkedEntityId: bestHyp.projectId,
              linkedEntityName: projName,
              linkedEntityTable: 'projects',
              linkType: 'project',
              confidence: Math.min(projConf, 0.99),
              matchReason: `Project inferred via ${bestHyp.method || 'keyword matching'}`,
              evidence: [
                { method: bestHyp.method || 'keyword', detail: `Confidence: ${(projConf * 100).toFixed(1)}%` },
              ],
              status: 'pending',
              verifiedBy: null,
              verifiedAt: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    autoLinkStore.set(getStoreKey(batchId), results);

    return results;
  }

  getAutoLinks(batchId: number): AutoLinkResult[] {
    return autoLinkStore.get(getStoreKey(batchId)) || [];
  }

  getAutoLinkById(batchId: number, linkId: number): AutoLinkResult | undefined {
    const links = this.getAutoLinks(batchId);
    return links.find(l => l.id === linkId);
  }

  getAutoLinkSummary(batchId: number): AutoLinkSummary {
    const links = this.getAutoLinks(batchId);
    return {
      total: links.length,
      verified: links.filter(l => l.status === 'accepted').length,
      pending: links.filter(l => l.status === 'pending').length,
      rejected: links.filter(l => l.status === 'rejected').length,
      highConfidence: links.filter(l => l.confidence > 0.85).length,
      mediumConfidence: links.filter(l => l.confidence >= 0.60 && l.confidence <= 0.85).length,
      lowConfidence: links.filter(l => l.confidence < 0.60).length,
    };
  }

  verifyLink(batchId: number, linkId: number, decision: 'accepted' | 'rejected', userId: string): AutoLinkResult | null {
    const links = autoLinkStore.get(getStoreKey(batchId));
    if (!links) return null;
    const link = links.find(l => l.id === linkId);
    if (!link) return null;
    link.status = decision;
    link.verifiedBy = userId;
    link.verifiedAt = new Date().toISOString();
    return link;
  }

  bulkVerify(batchId: number, minConfidence: number, userId: string): { accepted: number; skipped: number } {
    const links = autoLinkStore.get(getStoreKey(batchId));
    if (!links) return { accepted: 0, skipped: 0 };
    let accepted = 0;
    let skipped = 0;
    for (const link of links) {
      if (link.status !== 'pending') {
        skipped++;
        continue;
      }
      if (link.confidence >= minConfidence) {
        link.status = 'accepted';
        link.verifiedBy = userId;
        link.verifiedAt = new Date().toISOString();
        accepted++;
      } else {
        skipped++;
      }
    }
    return { accepted, skipped };
  }

  private extractNamesFromDescription(description: string, senderName: string | null): Array<{ name: string; source: string }> {
    const results: Array<{ name: string; source: string }> = [];
    const seen = new Set<string>();

    if (senderName && !/^\+?\d{7,}$/.test(senderName.trim())) {
      const normalized = normalizeForMatching(senderName);
      if (normalized.length >= 2 && !seen.has(normalized)) {
        seen.add(normalized);
        results.push({ name: senderName.trim(), source: 'sender' });
      }
    }

    const workerMatch = description.match(/\[عامل:\s*([^\]]+)\]/);
    if (workerMatch) {
      const name = workerMatch[1].trim();
      const normalized = normalizeForMatching(name);
      if (normalized.length >= 2 && !seen.has(normalized)) {
        seen.add(normalized);
        results.push({ name, source: 'worker_tag' });
      }
    }

    const recipientMatch = description.match(/\[مستلم:\s*([^\]]+)\]/);
    if (recipientMatch) {
      const name = recipientMatch[1].trim();
      const normalized = normalizeForMatching(name);
      if (normalized.length >= 2 && !seen.has(normalized)) {
        seen.add(normalized);
        results.push({ name, source: 'recipient_tag' });
      }
    }

    const companyPattern = /^([^\s-]+(?:\s+[^\s-]+)?)\s*-/;
    const companyMatch = description.match(companyPattern);
    if (companyMatch) {
      const name = companyMatch[1].trim();
      const normalized = normalizeForMatching(name);
      if (normalized.length >= 2 && !seen.has(normalized) && /[\u0600-\u06FF]/.test(name)) {
        seen.add(normalized);
        results.push({ name, source: 'description_prefix' });
      }
    }

    return results;
  }

  private findBestMatch(
    normalizedName: string,
    originalName: string,
    records: Array<{ id: string; name: string; normalizedName: string }>
  ): { record: { id: string; name: string }; confidence: number; reason: string; evidence: AutoLinkEvidence[] } | null {
    let bestMatch: { record: { id: string; name: string }; confidence: number; reason: string; evidence: AutoLinkEvidence[] } | null = null;

    for (const record of records) {
      if (normalizedName === record.normalizedName) {
        return {
          record: { id: record.id, name: record.name },
          confidence: 0.95,
          reason: 'Exact name match (normalized)',
          evidence: [
            { method: 'exact_match', detail: `"${originalName}" matches "${record.name}" exactly after normalization` },
          ],
        };
      }

      const similarity = arabicNameSimilarity(originalName, record.name);

      if (similarity >= 0.85) {
        const conf = Math.min(0.70 + (similarity - 0.85) * 2, 0.90);
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = {
            record: { id: record.id, name: record.name },
            confidence: conf,
            reason: `High similarity match (${(similarity * 100).toFixed(0)}%)`,
            evidence: [
              { method: 'fuzzy_match', detail: `"${originalName}" similar to "${record.name}" (${(similarity * 100).toFixed(0)}%)` },
            ],
          };
        }
      } else if (similarity >= 0.65) {
        const conf = Math.min(0.40 + (similarity - 0.65) * 1.5, 0.65);
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = {
            record: { id: record.id, name: record.name },
            confidence: conf,
            reason: `Partial similarity match (${(similarity * 100).toFixed(0)}%)`,
            evidence: [
              { method: 'partial_match', detail: `"${originalName}" partially similar to "${record.name}" (${(similarity * 100).toFixed(0)}%)` },
            ],
          };
        }
      }

      if (normalizedName.length > 3) {
        if (record.normalizedName.includes(normalizedName) || normalizedName.includes(record.normalizedName)) {
          const containConf = 0.75;
          if (!bestMatch || containConf > bestMatch.confidence) {
            bestMatch = {
              record: { id: record.id, name: record.name },
              confidence: containConf,
              reason: 'Name containment match',
              evidence: [
                { method: 'containment', detail: `"${originalName}" contained in or contains "${record.name}"` },
              ],
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private async resolveEntityName(entityId: string, entityTable: string): Promise<string | null> {
    try {
      if (entityTable === 'workers') {
        const [w] = await db.select({ name: workers.name }).from(workers).where(eq(workers.id, entityId)).limit(1);
        return w?.name || null;
      }
      if (entityTable === 'suppliers') {
        const [s] = await db.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, entityId)).limit(1);
        return s?.name || null;
      }
      if (entityTable === 'projects') {
        const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, entityId)).limit(1);
        return p?.name || null;
      }
      console.warn(`[AutoLinking] Unknown entity table "${entityTable}", skipping`);
      return null;
    } catch {
      return null;
    }
  }
}

export const autoLinkingService = new AutoLinkingService();
