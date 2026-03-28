import { db } from "../../db.js";
import { fundTransfers, materialPurchases, transportationExpenses, workerMiscExpenses, workerAttendance, workers } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { normalizeArabicText } from './ArabicAmountParser.js';
import { getDateWindow } from './FingerprintEngine.js';
import { safeParseNum } from '../../utils/safe-numbers.js';

export type MatchStatus = 'exact_match' | 'near_match' | 'conflict' | 'new_entry';

export interface MatchResult {
  matchStatus: MatchStatus;
  matchedTable: string | null;
  matchedRecordId: string | null;
  matchConfidence: number;
  matchReason: string;
}

export async function matchAgainstFundTransfers(
  amount: number,
  transferNumber: string | null,
  senderName: string | null,
  dateStr: string,
  projectId: string | null
): Promise<MatchResult> {
  if (transferNumber) {
    const exactMatches = await db.select()
      .from(fundTransfers)
      .where(eq(fundTransfers.transferNumber, transferNumber))
      .limit(1);

    if (exactMatches.length > 0) {
      return {
        matchStatus: 'exact_match',
        matchedTable: 'fund_transfers',
        matchedRecordId: exactMatches[0].id,
        matchConfidence: 1.0,
        matchReason: `transfer_number exact match: ${transferNumber}`,
      };
    }
  }

  const { start, end } = getDateWindow(dateStr, 1);
  const amountStr = amount.toString();

  const nearMatches = await db.select()
    .from(fundTransfers)
    .where(
      and(
        eq(fundTransfers.amount, amountStr),
        gte(fundTransfers.transferDate, new Date(start)),
        lte(fundTransfers.transferDate, new Date(end))
      )
    )
    .limit(5);

  if (nearMatches.length === 1) {
    const match = nearMatches[0];
    let confidence = 0.7;

    if (senderName && match.senderName) {
      const similarity = arabicNameSimilarity(senderName, match.senderName);
      if (similarity > 0.8) confidence = 0.85;
    }

    if (projectId && match.project_id === projectId) {
      confidence += 0.1;
    }

    return {
      matchStatus: 'near_match',
      matchedTable: 'fund_transfers',
      matchedRecordId: match.id,
      matchConfidence: Math.min(confidence, 0.99),
      matchReason: `amount+date match (±1 day), confidence: ${confidence}`,
    };
  }

  if (nearMatches.length > 1) {
    return {
      matchStatus: 'conflict',
      matchedTable: 'fund_transfers',
      matchedRecordId: nearMatches[0].id,
      matchConfidence: 0.4,
      matchReason: `${nearMatches.length} potential matches for amount ${amount} within ±1 day`,
    };
  }

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match in fund_transfers' };
}

export async function matchAgainstMaterialPurchases(
  amount: number,
  supplierName: string | null,
  description: string,
  dateStr: string,
  projectId: string | null
): Promise<MatchResult> {
  const { start, end } = getDateWindow(dateStr, 2);
  const amountStr = amount.toString();

  const nearMatches = await db.select()
    .from(materialPurchases)
    .where(
      and(
        eq(materialPurchases.totalAmount, amountStr),
        gte(materialPurchases.purchaseDate, start),
        lte(materialPurchases.purchaseDate, end)
      )
    )
    .limit(5);

  if (nearMatches.length === 0) {
    return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match in material_purchases' };
  }

  for (const match of nearMatches) {
    let confidence = 0.6;

    if (supplierName && match.supplierName) {
      const nameSim = arabicNameSimilarity(supplierName, match.supplierName);
      if (nameSim > 0.8) confidence += 0.2;
    }

    if (description && match.materialName) {
      const descSim = arabicNameSimilarity(description, match.materialName);
      if (descSim > 0.5) confidence += 0.1;
    }

    if (projectId && match.project_id === projectId) {
      confidence += 0.05;
    }

    if (confidence >= 0.75) {
      return {
        matchStatus: 'near_match',
        matchedTable: 'material_purchases',
        matchedRecordId: match.id,
        matchConfidence: Math.min(confidence, 0.99),
        matchReason: `amount+date+supplier match, confidence: ${confidence}`,
      };
    }
  }

  if (nearMatches.length > 1) {
    return {
      matchStatus: 'conflict',
      matchedTable: 'material_purchases',
      matchedRecordId: nearMatches[0].id,
      matchConfidence: 0.4,
      matchReason: `${nearMatches.length} potential matches within ±2 days`,
    };
  }

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no strong match in material_purchases' };
}

export async function matchAgainstTransportation(
  amount: number,
  description: string,
  dateStr: string
): Promise<MatchResult> {
  const { start, end } = getDateWindow(dateStr, 1);

  const matches = await db.select()
    .from(transportationExpenses)
    .where(
      and(
        eq(transportationExpenses.amount, amount.toString()),
        gte(transportationExpenses.date, start),
        lte(transportationExpenses.date, end)
      )
    )
    .limit(3);

  if (matches.length === 1) {
    return {
      matchStatus: 'near_match',
      matchedTable: 'transportation_expenses',
      matchedRecordId: matches[0].id,
      matchConfidence: 0.75,
      matchReason: `amount+date match in transportation_expenses`,
    };
  }

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match in transportation_expenses' };
}

export async function matchAgainstWorkerAttendance(
  amount: number,
  workerId: string | null,
  dateStr: string,
  projectId: string | null
): Promise<MatchResult> {
  const { start, end } = getDateWindow(dateStr, 1);

  const conditions = [
    gte(workerAttendance.attendanceDate, start),
    lte(workerAttendance.attendanceDate, end),
  ];

  if (workerId) {
    conditions.push(eq(workerAttendance.worker_id, workerId));
  }

  if (projectId) {
    conditions.push(eq(workerAttendance.project_id, projectId));
  }

  const matches = await db.select()
    .from(workerAttendance)
    .where(and(...conditions))
    .limit(5);

  const amountMatches = matches.filter((m: { totalPay: string | null; paidAmount: string | null }) => {
    const totalPay = safeParseNum(m.totalPay);
    const paidAmount = safeParseNum(m.paidAmount);
    return Math.abs(totalPay - amount) < 1 || Math.abs(paidAmount - amount) < 1;
  });

  if (amountMatches.length === 1) {
    let confidence = 0.7;
    if (workerId && amountMatches[0].worker_id === workerId) confidence += 0.15;
    if (projectId && amountMatches[0].project_id === projectId) confidence += 0.1;

    return {
      matchStatus: 'near_match',
      matchedTable: 'worker_attendance',
      matchedRecordId: amountMatches[0].id,
      matchConfidence: Math.min(confidence, 0.99),
      matchReason: `worker+date+amount match in worker_attendance, confidence: ${confidence}`,
    };
  }

  if (amountMatches.length > 1) {
    return {
      matchStatus: 'conflict',
      matchedTable: 'worker_attendance',
      matchedRecordId: amountMatches[0].id,
      matchConfidence: 0.4,
      matchReason: `${amountMatches.length} potential matches in worker_attendance within ±1 day`,
    };
  }

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match in worker_attendance' };
}

export async function matchAgainstWorkerMiscExpenses(
  amount: number,
  description: string,
  dateStr: string,
  projectId: string | null
): Promise<MatchResult> {
  const { start, end } = getDateWindow(dateStr, 2);
  const amountStr = amount.toString();

  const conditions = [
    eq(workerMiscExpenses.amount, amountStr),
    gte(workerMiscExpenses.date, start),
    lte(workerMiscExpenses.date, end),
  ];

  if (projectId) {
    conditions.push(eq(workerMiscExpenses.project_id, projectId));
  }

  const matches = await db.select()
    .from(workerMiscExpenses)
    .where(and(...conditions))
    .limit(5);

  if (matches.length === 0) {
    return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match in worker_misc_expenses' };
  }

  for (const match of matches) {
    let confidence = 0.65;

    if (description && match.description) {
      const descSim = arabicNameSimilarity(description, match.description);
      if (descSim > 0.6) confidence += 0.2;
    }

    if (projectId && match.project_id === projectId) {
      confidence += 0.1;
    }

    if (confidence >= 0.75) {
      return {
        matchStatus: 'near_match',
        matchedTable: 'worker_misc_expenses',
        matchedRecordId: match.id,
        matchConfidence: Math.min(confidence, 0.99),
        matchReason: `amount+date+description match in worker_misc_expenses, confidence: ${confidence}`,
      };
    }
  }

  if (matches.length > 1) {
    return {
      matchStatus: 'conflict',
      matchedTable: 'worker_misc_expenses',
      matchedRecordId: matches[0].id,
      matchConfidence: 0.4,
      matchReason: `${matches.length} potential matches in worker_misc_expenses within ±2 days`,
    };
  }

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no strong match in worker_misc_expenses' };
}

export async function resolveWorkerIdFromName(name: string): Promise<string | null> {
  if (!name) return null;
  const matches = await db.select({ id: workers.id })
    .from(workers)
    .where(eq(workers.name, name))
    .limit(1);
  return matches.length > 0 ? matches[0].id : null;
}

export async function matchCandidate(
  amount: number,
  candidateType: string,
  category: string | null,
  transferNumber: string | null,
  senderName: string | null,
  description: string,
  dateStr: string,
  projectId: string | null
): Promise<MatchResult> {
  if (candidateType === 'transfer' || transferNumber) {
    return matchAgainstFundTransfers(amount, transferNumber, senderName, dateStr, projectId);
  }

  if (category && ['fuel', 'transport', 'transportation'].includes(category)) {
    const transportMatch = await matchAgainstTransportation(amount, description, dateStr);
    if (transportMatch.matchStatus !== 'new_entry') return transportMatch;
  }

  if (category && ['cement', 'concrete', 'steel', 'construction_materials', 'water'].includes(category)) {
    return matchAgainstMaterialPurchases(amount, senderName, description, dateStr, projectId);
  }

  if (category && ['wages', 'labor', 'attendance', 'worker_payment'].includes(category)) {
    const workerId = senderName ? await resolveWorkerIdFromName(senderName) : null;
    const waMatch = await matchAgainstWorkerAttendance(amount, workerId, dateStr, projectId);
    if (waMatch.matchStatus !== 'new_entry') return waMatch;
  }

  if (category && ['misc', 'miscellaneous', 'نثريات', 'misc_expense'].includes(category)) {
    const miscMatch = await matchAgainstWorkerMiscExpenses(amount, description, dateStr, projectId);
    if (miscMatch.matchStatus !== 'new_entry') return miscMatch;
  }

  const ftMatch = await matchAgainstFundTransfers(amount, null, senderName, dateStr, projectId);
  if (ftMatch.matchStatus !== 'new_entry') return ftMatch;

  const mpMatch = await matchAgainstMaterialPurchases(amount, null, description, dateStr, projectId);
  if (mpMatch.matchStatus !== 'new_entry') return mpMatch;

  const miscMatch = await matchAgainstWorkerMiscExpenses(amount, description, dateStr, projectId);
  if (miscMatch.matchStatus !== 'new_entry') return miscMatch;

  const workerId = senderName ? await resolveWorkerIdFromName(senderName) : null;
  const waMatch = await matchAgainstWorkerAttendance(amount, workerId, dateStr, projectId);
  if (waMatch.matchStatus !== 'new_entry') return waMatch;

  return { matchStatus: 'new_entry', matchedTable: null, matchedRecordId: null, matchConfidence: 0, matchReason: 'no match found in any ERP table' };
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
