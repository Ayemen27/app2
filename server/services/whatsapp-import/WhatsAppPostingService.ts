import { db, pool } from "../../db.js";
import {
  waCanonicalTransactions,
  waPostingResults,
  waReviewActions,
  waExtractionCandidates,
  waVerificationQueue,
  fundTransfers,
  materialPurchases,
  transportationExpenses,
  workerMiscExpenses,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { FinancialLedgerService } from "../FinancialLedgerService.js";
import { safeParseNum } from "../../utils/safe-numbers.js";
import { formatDateForFingerprint } from './FingerprintEngine.js';
import { getTransactionDate } from './DateResolver.js';

export interface PostingPlanItem {
  canonicalTransactionId: number;
  targetTable: string;
  amount: number;
  projectId: string | null;
  description: string | null;
  transactionDate: string;
  journalEntryPreview: { debit: string; credit: string; amount: number }[];
}

export interface PostingResult {
  canonicalTransactionId: number;
  status: 'success' | 'failed' | 'skipped_duplicate';
  targetTable: string;
  targetRecordId: string | null;
  errorMessage: string | null;
  attemptNumber: number;
}

async function getNextAttemptNumber(canonicalTransactionId: number): Promise<number> {
  const result = await db.select({ maxAttempt: sql<number>`COALESCE(MAX(attempt_number), 0) + 1` })
    .from(waPostingResults)
    .where(eq(waPostingResults.canonicalTransactionId, canonicalTransactionId));
  return result[0]?.maxAttempt || 1;
}

async function checkAlreadyPosted(canonicalTransactionId: number): Promise<boolean> {
  const existing = await db.select()
    .from(waPostingResults)
    .where(
      and(
        eq(waPostingResults.canonicalTransactionId, canonicalTransactionId),
        eq(waPostingResults.postingStatus, 'success')
      )
    )
    .limit(1);
  return existing.length > 0;
}

function resolveTargetTable(transactionType: string | null, category: string | null): string {
  if (transactionType === 'transfer') return 'fund_transfers';

  const cat = (category || '').toLowerCase();
  if (['cement', 'concrete', 'steel', 'construction_materials', 'water', 'materials'].includes(cat)) {
    return 'material_purchases';
  }
  if (['fuel', 'transport', 'transportation'].includes(cat)) {
    return 'transportation_expenses';
  }
  if (['labor', 'wages', 'carpentry'].includes(cat)) {
    return 'worker_misc_expenses';
  }
  if (['food', 'meals'].includes(cat)) {
    return 'worker_misc_expenses';
  }

  return 'worker_misc_expenses';
}

export async function generatePostingPlan(batchId: number): Promise<PostingPlanItem[]> {
  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.batchId, batchId));

  const approvedCandidateIds = candidates
    .filter((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId !== null)
    .map((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId!);

  if (approvedCandidateIds.length === 0) return [];

  const canonicals = await db.select()
    .from(waCanonicalTransactions)
    .where(
      and(
        sql`${waCanonicalTransactions.id} = ANY(${approvedCandidateIds})`,
        eq(waCanonicalTransactions.status, 'confirmed')
      )
    );

  const alreadyPosted = new Set<number>();
  for (const c of canonicals) {
    if (await checkAlreadyPosted(c.id)) alreadyPosted.add(c.id);
  }

  const plan: PostingPlanItem[] = [];

  for (const txn of canonicals) {
    if (alreadyPosted.has(txn.id)) continue;
    const amount = safeParseNum(txn.amount);
    if (amount <= 0) continue;

    const targetTable = resolveTargetTable(txn.transactionType, null);
    const dateStr = txn.transactionDate || new Date().toISOString().split('T')[0];
    const journalPreview = getJournalPreview(targetTable, amount);

    plan.push({
      canonicalTransactionId: txn.id,
      targetTable,
      amount,
      projectId: txn.projectId,
      description: txn.description,
      transactionDate: dateStr,
      journalEntryPreview: journalPreview,
    });
  }

  return plan;
}

function getJournalPreview(targetTable: string, amount: number): { debit: string; credit: string; amount: number }[] {
  switch (targetTable) {
    case 'fund_transfers':
      return [
        { debit: 'CASH', credit: '', amount },
        { debit: '', credit: 'FUND_TRANSFER_IN', amount },
      ];
    case 'material_purchases':
      return [
        { debit: 'MATERIAL_EXPENSE', credit: '', amount },
        { debit: '', credit: 'CASH', amount },
      ];
    case 'transportation_expenses':
      return [
        { debit: 'TRANSPORT_EXPENSE', credit: '', amount },
        { debit: '', credit: 'CASH', amount },
      ];
    case 'worker_misc_expenses':
      return [
        { debit: 'MISC_EXPENSE', credit: '', amount },
        { debit: '', credit: 'CASH', amount },
      ];
    default:
      return [
        { debit: 'MISC_EXPENSE', credit: '', amount },
        { debit: '', credit: 'CASH', amount },
      ];
  }
}

export async function postApprovedTransaction(
  canonicalTransactionId: number,
  postedBy: string
): Promise<PostingResult> {
  const alreadyPosted = await checkAlreadyPosted(canonicalTransactionId);
  if (alreadyPosted) {
    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await db.insert(waPostingResults).values({
      canonicalTransactionId,
      targetTable: 'skipped',
      postingStatus: 'skipped_duplicate',
      postedBy,
      attemptNumber: attemptNum,
      errorMessage: 'already_posted',
    });
    return {
      canonicalTransactionId,
      status: 'skipped_duplicate',
      targetTable: 'skipped',
      targetRecordId: null,
      errorMessage: 'already_posted',
      attemptNumber: attemptNum,
    };
  }

  const canonical = await db.select()
    .from(waCanonicalTransactions)
    .where(eq(waCanonicalTransactions.id, canonicalTransactionId))
    .limit(1);

  if (canonical.length === 0) {
    return {
      canonicalTransactionId,
      status: 'failed',
      targetTable: 'unknown',
      targetRecordId: null,
      errorMessage: 'Canonical transaction not found',
      attemptNumber: 1,
    };
  }

  const txn = canonical[0];
  if (txn.status !== 'confirmed') {
    return {
      canonicalTransactionId,
      status: 'failed',
      targetTable: 'unknown',
      targetRecordId: null,
      errorMessage: `Transaction status is '${txn.status}', must be 'confirmed' to post`,
      attemptNumber: 1,
    };
  }

  const amount = safeParseNum(txn.amount);
  const targetTable = resolveTargetTable(txn.transactionType, txn.category);
  const dateStr = txn.transactionDate || new Date().toISOString().split('T')[0];
  const projectId = txn.projectId;

  if (!projectId) {
    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await db.insert(waPostingResults).values({
      canonicalTransactionId,
      targetTable,
      postingStatus: 'failed',
      postedBy,
      attemptNumber: attemptNum,
      errorMessage: 'No project assigned',
    });
    return {
      canonicalTransactionId,
      status: 'failed',
      targetTable,
      targetRecordId: null,
      errorMessage: 'No project assigned',
      attemptNumber: attemptNum,
    };
  }

  const idempotencyKey = `wa_post_canonical_${canonicalTransactionId}`;
  const existingByKey = await db.select()
    .from(waPostingResults)
    .where(
      and(
        eq(waPostingResults.idempotencyKey, idempotencyKey),
        eq(waPostingResults.postingStatus, 'success')
      )
    )
    .limit(1);

  if (existingByKey.length > 0) {
    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await db.insert(waPostingResults).values({
      canonicalTransactionId,
      targetTable: existingByKey[0].targetTable,
      postingStatus: 'skipped_duplicate',
      postedBy,
      attemptNumber: attemptNum,
      errorMessage: 'idempotency_key_duplicate',
      idempotencyKey: `${idempotencyKey}_skip_${Date.now()}`,
    });
    return {
      canonicalTransactionId,
      status: 'skipped_duplicate',
      targetTable: existingByKey[0].targetTable,
      targetRecordId: existingByKey[0].targetRecordId,
      errorMessage: 'idempotency_key_duplicate',
      attemptNumber: attemptNum,
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let targetRecordId: string;
    const idResult = await client.query(`SELECT gen_random_uuid() as id`);
    targetRecordId = idResult.rows[0].id;

    switch (targetTable) {
      case 'fund_transfers':
        await client.query(
          `INSERT INTO fund_transfers (id, project_id, amount, sender_name, transfer_number, transfer_type, transfer_date, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [targetRecordId, projectId, amount, null, null, 'حولة', dateStr, `[WA Import] ${txn.description || ''}`]
        );
        await FinancialLedgerService.recordFundTransferWithClient(client, projectId, amount, dateStr, targetRecordId, postedBy);
        break;

      case 'material_purchases':
        await client.query(
          `INSERT INTO material_purchases (id, project_id, material_name, quantity, unit, unit_price, total_amount, purchase_type, paid_amount, purchase_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [targetRecordId, projectId, txn.description || 'مواد', '1', 'مجموعة', amount, amount, 'نقد', amount, dateStr, `[WA Import] ${txn.description || ''}`]
        );
        await FinancialLedgerService.recordMaterialPurchaseWithClient(client, projectId, amount, dateStr, targetRecordId, 'نقد', postedBy);
        break;

      case 'transportation_expenses':
        await client.query(
          `INSERT INTO transportation_expenses (id, project_id, amount, date, description, expense_type, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [targetRecordId, projectId, amount, dateStr, txn.description || 'مواصلات', 'fuel', `[WA Import] ${txn.description || ''}`]
        );
        await FinancialLedgerService.recordTransportExpenseWithClient(client, projectId, amount, dateStr, targetRecordId, postedBy);
        break;

      case 'worker_misc_expenses':
        await client.query(
          `INSERT INTO worker_misc_expenses (id, project_id, amount, date, description, expense_type, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [targetRecordId, projectId, amount, dateStr, txn.description || 'مصاريف', 'misc', `[WA Import] ${txn.description || ''}`]
        );
        await FinancialLedgerService.recordMiscExpenseWithClient(client, projectId, amount, dateStr, targetRecordId, postedBy);
        break;

      default:
        throw new Error(`Unsupported target table: ${targetTable}`);
    }

    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await client.query(
      `INSERT INTO wa_posting_results (canonical_transaction_id, target_table, target_record_id, posted_by, posting_status, idempotency_key, attempt_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [canonicalTransactionId, targetTable, targetRecordId, postedBy, 'success', idempotencyKey, attemptNum]
    );

    await client.query('COMMIT');

    return {
      canonicalTransactionId,
      status: 'success',
      targetTable,
      targetRecordId,
      errorMessage: null,
      attemptNumber: attemptNum,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error.code === '23505' && error.constraint?.includes('posting_success')) {
      const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
      await db.insert(waPostingResults).values({
        canonicalTransactionId,
        targetTable: 'skipped',
        postingStatus: 'skipped_duplicate',
        postedBy,
        attemptNumber: attemptNum,
        errorMessage: 'concurrent_duplicate_detected',
      });
      return {
        canonicalTransactionId,
        status: 'skipped_duplicate',
        targetTable,
        targetRecordId: null,
        errorMessage: 'concurrent_duplicate_detected',
        attemptNumber: attemptNum,
      };
    }

    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await db.insert(waPostingResults).values({
      canonicalTransactionId,
      targetTable,
      postingStatus: 'failed',
      postedBy,
      attemptNumber: attemptNum,
      errorMessage: error.message?.slice(0, 500),
    });

    return {
      canonicalTransactionId,
      status: 'failed',
      targetTable,
      targetRecordId: null,
      errorMessage: error.message,
      attemptNumber: attemptNum,
    };
  } finally {
    client.release();
  }
}

export async function postBatchApproved(
  batchId: number,
  postedBy: string
): Promise<PostingResult[]> {
  const batchCandidates = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.batchId, batchId));

  const canonicalIds = batchCandidates
    .filter((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId !== null)
    .map((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId!);

  if (canonicalIds.length === 0) return [];

  const canonicals = await db.select()
    .from(waCanonicalTransactions)
    .where(
      and(
        sql`${waCanonicalTransactions.id} = ANY(${canonicalIds})`,
        eq(waCanonicalTransactions.status, 'confirmed')
      )
    );

  const results: PostingResult[] = [];
  for (const txn of canonicals) {
    const result = await postApprovedTransaction(txn.id, postedBy);
    results.push(result);
  }

  return results;
}

export async function approveCandidate(
  candidateId: number,
  reviewerId: string,
  projectId: string,
  notes?: string
): Promise<{ canonicalId: number }> {
  const candidate = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.id, candidateId))
    .limit(1);

  if (candidate.length === 0) throw new Error('Candidate not found');

  const c = candidate[0];

  const beforeState = { matchStatus: c.matchStatus, candidateType: c.candidateType };

  let dateStr: string | null = null;
  try {
    dateStr = await getTransactionDate(c.id, c.sourceMessageId, c.createdAt ? new Date(c.createdAt) : null);
  } catch { /* fallback below */ }
  if (!dateStr && c.createdAt) {
    dateStr = formatDateForFingerprint(new Date(c.createdAt));
  }

  return await db.transaction(async (tx: any) => {
    if (c.canonicalTransactionId) {
      const existing = await tx.select().from(waCanonicalTransactions)
        .where(eq(waCanonicalTransactions.id, c.canonicalTransactionId)).limit(1);
      if (existing.length > 0 && ['confirmed', 'posted'].includes(existing[0].status || '')) {
        throw new Error('Candidate already confirmed/posted');
      }
      await tx.update(waCanonicalTransactions)
        .set({ status: 'confirmed', projectId, transactionDate: dateStr, reviewNotes: notes || null })
        .where(eq(waCanonicalTransactions.id, c.canonicalTransactionId));

      await tx.insert(waReviewActions).values({
        actionType: 'approve',
        canonicalTransactionId: c.canonicalTransactionId,
        candidateId,
        reviewerId,
        beforeState,
        afterState: { status: 'confirmed', projectId },
        notes: notes || null,
      });

      return { canonicalId: c.canonicalTransactionId };
    }

    const [canonical] = await tx.insert(waCanonicalTransactions).values({
      status: 'confirmed',
      transactionType: c.candidateType,
      amount: c.amount,
      description: c.description,
      transactionDate: dateStr,
      projectId,
      category: c.category,
      mergedFromCandidates: [c.id],
    }).returning();

    await tx.update(waExtractionCandidates)
      .set({ canonicalTransactionId: canonical.id, matchStatus: 'new_entry' })
      .where(eq(waExtractionCandidates.id, candidateId));

    await tx.insert(waReviewActions).values({
      actionType: 'approve',
      canonicalTransactionId: canonical.id,
      candidateId,
      reviewerId,
      beforeState,
      afterState: { status: 'confirmed', projectId },
      notes,
    });

    return { canonicalId: canonical.id };
  });
}

export async function rejectCandidate(
  candidateId: number,
  reviewerId: string,
  reason: string
): Promise<void> {
  const candidate = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.id, candidateId))
    .limit(1);

  if (candidate.length === 0) throw new Error('Candidate not found');

  const c = candidate[0];
  const beforeState = { matchStatus: c.matchStatus, candidateType: c.candidateType };

  await db.transaction(async (tx: any) => {
    let canonicalId: number;

    if (c.canonicalTransactionId) {
      const existing = await tx.select().from(waCanonicalTransactions)
        .where(eq(waCanonicalTransactions.id, c.canonicalTransactionId)).limit(1);
      if (existing.length > 0 && ['confirmed', 'posted'].includes(existing[0].status || '')) {
        throw new Error('Candidate already confirmed/posted — cannot reject');
      }
      await tx.update(waCanonicalTransactions)
        .set({ status: 'excluded', excludeReason: reason })
        .where(eq(waCanonicalTransactions.id, c.canonicalTransactionId));
      canonicalId = c.canonicalTransactionId;
    } else {
      const [canonical] = await tx.insert(waCanonicalTransactions).values({
        status: 'excluded',
        transactionType: c.candidateType,
        amount: c.amount,
        description: c.description,
        excludeReason: reason,
        mergedFromCandidates: [c.id],
      }).returning();
      canonicalId = canonical.id;

      await tx.update(waExtractionCandidates)
        .set({ canonicalTransactionId: canonicalId })
        .where(eq(waExtractionCandidates.id, candidateId));
    }

    await tx.insert(waReviewActions).values({
      actionType: 'reject',
      canonicalTransactionId: canonicalId,
      candidateId,
      reviewerId,
      beforeState,
      afterState: { status: 'excluded', reason },
      notes: reason,
    });
  });
}

export async function updateCandidateFields(
  candidateId: number,
  reviewerId: string,
  updates: { amount?: string; description?: string }
): Promise<any> {
  const candidate = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.id, candidateId))
    .limit(1);

  if (candidate.length === 0) throw new Error('Candidate not found');
  const c = candidate[0];
  if (c.canonicalTransactionId) throw new Error('Cannot edit a reviewed candidate');

  const beforeState = { amount: c.amount, description: c.description };
  const setFields: any = {};
  if (updates.amount !== undefined) setFields.amount = updates.amount;
  if (updates.description !== undefined) setFields.description = updates.description;

  const [updated] = await db.update(waExtractionCandidates)
    .set(setFields)
    .where(eq(waExtractionCandidates.id, candidateId))
    .returning();

  await db.insert(waReviewActions).values({
    actionType: 'edit',
    candidateId,
    reviewerId,
    beforeState,
    afterState: setFields,
    notes: 'Inline edit',
  });

  return updated;
}

export async function mergeCandidates(
  candidateIds: number[],
  reviewerId: string,
  projectId: string
): Promise<{ canonicalId: number }> {
  if (candidateIds.length < 2) throw new Error('Need at least 2 candidates to merge');

  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(sql`${waExtractionCandidates.id} = ANY(${candidateIds})`);

  if (candidates.length !== candidateIds.length) throw new Error('Some candidates not found');
  if (candidates.some((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId)) throw new Error('Some candidates already reviewed');

  const totalAmount = candidates.reduce((sum: number, c: { amount: string | null }) => sum + safeParseNum(c.amount), 0);
  const descriptions = candidates.map((c: { description: string | null }) => c.description).filter(Boolean).join(' + ');

  return await db.transaction(async (tx: any) => {
    const [canonical] = await tx.insert(waCanonicalTransactions).values({
      status: 'confirmed',
      transactionType: candidates[0].candidateType,
      amount: totalAmount.toString(),
      description: descriptions || null,
      projectId,
      category: candidates[0].category,
      mergedFromCandidates: candidateIds,
    }).returning();

    for (const c of candidates) {
      await tx.update(waExtractionCandidates)
        .set({ canonicalTransactionId: canonical.id, matchStatus: 'new_entry' })
        .where(eq(waExtractionCandidates.id, c.id));
    }

    await tx.insert(waReviewActions).values({
      actionType: 'merge',
      canonicalTransactionId: canonical.id,
      reviewerId,
      beforeState: { candidateIds },
      afterState: { status: 'confirmed', totalAmount, projectId },
      notes: `Merged ${candidateIds.length} candidates`,
    });

    return { canonicalId: canonical.id };
  });
}

export async function splitCandidate(
  candidateId: number,
  reviewerId: string,
  projectId: string,
  splits: { amount: string; description: string }[]
): Promise<{ canonicalIds: number[] }> {
  if (splits.length < 2) throw new Error('Need at least 2 splits');

  const candidate = await db.select()
    .from(waExtractionCandidates)
    .where(eq(waExtractionCandidates.id, candidateId))
    .limit(1);

  if (candidate.length === 0) throw new Error('Candidate not found');
  const c = candidate[0];

  if (c.canonicalTransactionId) {
    const existing = await db.select().from(waCanonicalTransactions)
      .where(eq(waCanonicalTransactions.id, c.canonicalTransactionId)).limit(1);
    if (existing.length > 0 && ['confirmed', 'posted'].includes(existing[0].status || '')) {
      throw new Error('Candidate already confirmed/posted');
    }
  }

  const originalAmount = safeParseNum(c.amount);
  const splitTotal = splits.reduce((sum, s) => sum + safeParseNum(s.amount), 0);
  if (Math.abs(splitTotal - originalAmount) > 0.01) {
    throw new Error(`Split total (${splitTotal}) does not match original amount (${originalAmount})`);
  }

  return await db.transaction(async (tx: any) => {
    const canonicalIds: number[] = [];

    for (const split of splits) {
      const [canonical] = await tx.insert(waCanonicalTransactions).values({
        status: 'confirmed',
        transactionType: c.candidateType,
        amount: split.amount,
        description: split.description,
        projectId,
        category: c.category,
        mergedFromCandidates: [candidateId],
      }).returning();
      canonicalIds.push(canonical.id);
    }

    await tx.update(waExtractionCandidates)
      .set({ canonicalTransactionId: canonicalIds[0], matchStatus: 'new_entry' })
      .where(eq(waExtractionCandidates.id, candidateId));

    await tx.insert(waReviewActions).values({
      actionType: 'split',
      canonicalTransactionId: canonicalIds[0],
      candidateId,
      reviewerId,
      beforeState: { amount: c.amount, description: c.description },
      afterState: { splits, canonicalIds },
      notes: `Split into ${splits.length} transactions`,
    });

    return { canonicalIds };
  });
}

export async function bulkApprove(
  batchId: number,
  reviewerId: string,
  minConfidence: number = 0.95,
  projectId: string
): Promise<{ approved: number; skipped: number }> {
  const candidates = await db.select()
    .from(waExtractionCandidates)
    .where(
      and(
        eq(waExtractionCandidates.batchId, batchId),
        eq(waExtractionCandidates.matchStatus, 'new_entry')
      )
    );

  let approved = 0;
  let skipped = 0;

  for (const c of candidates) {
    const confidence = safeParseNum(c.confidence);
    if (confidence >= minConfidence && !c.canonicalTransactionId) {
      await approveCandidate(c.id, reviewerId, projectId);
      approved++;
    } else {
      skipped++;
    }
  }

  return { approved, skipped };
}
