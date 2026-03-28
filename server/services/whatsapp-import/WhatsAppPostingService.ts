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

  const candidateIds = candidates.map((c: { id: number }) => c.id);

  const canonicals = await db.select()
    .from(waCanonicalTransactions)
    .where(
      and(
        sql`(${waCanonicalTransactions.id} = ANY(${approvedCandidateIds}) OR ${waCanonicalTransactions.mergedFromCandidates} && ${candidateIds})`,
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

    const targetTable = resolveTargetTable(txn.transactionType, txn.category);
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
  if (amount <= 0) {
    const attemptNum = await getNextAttemptNumber(canonicalTransactionId);
    await db.insert(waPostingResults).values({
      canonicalTransactionId,
      targetTable: 'unknown',
      postingStatus: 'failed',
      postedBy,
      attemptNumber: attemptNum,
      errorMessage: 'Invalid amount: must be greater than zero',
    });
    return {
      canonicalTransactionId,
      status: 'failed',
      targetTable: 'unknown',
      targetRecordId: null,
      errorMessage: 'Invalid amount: must be greater than zero',
      attemptNumber: attemptNum,
    };
  }
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

    const balanceCheck = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) AS balance FROM journal_entries WHERE reference_id = $1`,
      [targetRecordId]
    );
    const ledgerBalance = parseFloat(balanceCheck.rows[0]?.balance || '0');
    if (Math.abs(ledgerBalance) > 0.01) {
      throw new Error(`Ledger balance check failed: debit - credit = ${ledgerBalance} (expected 0). Rolling back.`);
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

  const batchCandidateIds = batchCandidates.map((c: { id: number }) => c.id);

  const canonicals = await db.select()
    .from(waCanonicalTransactions)
    .where(
      and(
        sql`(${waCanonicalTransactions.id} = ANY(${canonicalIds}) OR ${waCanonicalTransactions.mergedFromCandidates} && ${batchCandidateIds})`,
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedRes = await client.query(
      `SELECT * FROM wa_extraction_candidates WHERE id = $1 FOR UPDATE`,
      [candidateId]
    );
    if (lockedRes.rows.length === 0) throw new Error('Candidate not found');

    const c = lockedRes.rows[0];

    const amount = safeParseNum(c.amount);
    if (amount <= 0) throw new Error('Invalid amount: must be greater than zero');

    const beforeState = { matchStatus: c.match_status, candidateType: c.candidate_type };

    let dateStr: string | null = null;
    try {
      dateStr = await getTransactionDate(c.id, c.source_message_id, c.created_at ? new Date(c.created_at) : null);
    } catch { /* fallback below */ }
    if (!dateStr && c.created_at) {
      dateStr = formatDateForFingerprint(new Date(c.created_at));
    }

    if (c.canonical_transaction_id) {
      const existingRes = await client.query(
        `SELECT * FROM wa_canonical_transactions WHERE id = $1 FOR UPDATE`,
        [c.canonical_transaction_id]
      );
      if (existingRes.rows.length > 0 && ['confirmed', 'posted'].includes(existingRes.rows[0].status || '')) {
        throw new Error('Candidate already confirmed/posted');
      }
      await client.query(
        `UPDATE wa_canonical_transactions SET status = 'confirmed', project_id = $1, transaction_date = $2, review_notes = $3 WHERE id = $4`,
        [projectId, dateStr, notes || null, c.canonical_transaction_id]
      );

      await client.query(
        `INSERT INTO wa_review_actions (action_type, canonical_transaction_id, candidate_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['approve', c.canonical_transaction_id, candidateId, reviewerId, JSON.stringify(beforeState), JSON.stringify({ status: 'confirmed', projectId }), notes || null]
      );

      await client.query('COMMIT');
      return { canonicalId: c.canonical_transaction_id };
    }

    const canonicalRes = await client.query(
      `INSERT INTO wa_canonical_transactions (status, transaction_type, amount, description, transaction_date, project_id, category, merged_from_candidates) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      ['confirmed', c.candidate_type, c.amount, c.description, dateStr, projectId, c.category, JSON.stringify([c.id])]
    );
    const canonicalId = canonicalRes.rows[0].id;

    await client.query(
      `UPDATE wa_extraction_candidates SET canonical_transaction_id = $1, match_status = 'new_entry' WHERE id = $2`,
      [canonicalId, candidateId]
    );

    await client.query(
      `INSERT INTO wa_review_actions (action_type, canonical_transaction_id, candidate_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['approve', canonicalId, candidateId, reviewerId, JSON.stringify(beforeState), JSON.stringify({ status: 'confirmed', projectId }), notes || null]
    );

    await client.query('COMMIT');
    return { canonicalId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectCandidate(
  candidateId: number,
  reviewerId: string,
  reason: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedRes = await client.query(
      `SELECT * FROM wa_extraction_candidates WHERE id = $1 FOR UPDATE`,
      [candidateId]
    );
    if (lockedRes.rows.length === 0) throw new Error('Candidate not found');

    const c = lockedRes.rows[0];
    const beforeState = { matchStatus: c.match_status, candidateType: c.candidate_type };

    let canonicalId: number;

    if (c.canonical_transaction_id) {
      const existingRes = await client.query(
        `SELECT * FROM wa_canonical_transactions WHERE id = $1 FOR UPDATE`,
        [c.canonical_transaction_id]
      );
      if (existingRes.rows.length > 0 && ['confirmed', 'posted'].includes(existingRes.rows[0].status || '')) {
        throw new Error('Candidate already confirmed/posted — cannot reject');
      }
      await client.query(
        `UPDATE wa_canonical_transactions SET status = 'excluded', exclude_reason = $1 WHERE id = $2`,
        [reason, c.canonical_transaction_id]
      );
      canonicalId = c.canonical_transaction_id;
    } else {
      const canonicalRes = await client.query(
        `INSERT INTO wa_canonical_transactions (status, transaction_type, amount, description, exclude_reason, merged_from_candidates) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['excluded', c.candidate_type, c.amount, c.description, reason, JSON.stringify([c.id])]
      );
      canonicalId = canonicalRes.rows[0].id;

      await client.query(
        `UPDATE wa_extraction_candidates SET canonical_transaction_id = $1 WHERE id = $2`,
        [canonicalId, candidateId]
      );
    }

    await client.query(
      `INSERT INTO wa_review_actions (action_type, canonical_transaction_id, candidate_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['reject', canonicalId, candidateId, reviewerId, JSON.stringify(beforeState), JSON.stringify({ status: 'excluded', reason }), reason]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCandidateFields(
  candidateId: number,
  reviewerId: string,
  updates: { amount?: string; description?: string; candidateType?: string; category?: string }
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedRes = await client.query(
      `SELECT * FROM wa_extraction_candidates WHERE id = $1 FOR UPDATE`,
      [candidateId]
    );
    if (lockedRes.rows.length === 0) throw new Error('Candidate not found');
    const c = lockedRes.rows[0];
    if (c.canonical_transaction_id) throw new Error('Cannot edit a reviewed candidate');

    const beforeState = { amount: c.amount, description: c.description, candidate_type: c.candidate_type, category: c.category };
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (updates.amount !== undefined) {
      setClauses.push(`amount = $${paramIdx++}`);
      params.push(updates.amount);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(updates.description);
    }
    if (updates.candidateType !== undefined) {
      setClauses.push(`candidate_type = $${paramIdx++}`);
      params.push(updates.candidateType);
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIdx++}`);
      params.push(updates.category);
    }

    params.push(candidateId);
    const updatedRes = await client.query(
      `UPDATE wa_extraction_candidates SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    const afterState: any = {};
    if (updates.amount !== undefined) afterState.amount = updates.amount;
    if (updates.description !== undefined) afterState.description = updates.description;

    await client.query(
      `INSERT INTO wa_review_actions (action_type, candidate_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['edit', candidateId, reviewerId, JSON.stringify(beforeState), JSON.stringify(afterState), 'Inline edit']
    );

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function mergeCandidates(
  candidateIds: number[],
  reviewerId: string,
  projectId: string
): Promise<{ canonicalId: number }> {
  if (candidateIds.length < 2) throw new Error('Need at least 2 candidates to merge');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedRes = await client.query(
      `SELECT * FROM wa_extraction_candidates WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
      [candidateIds]
    );

    if (lockedRes.rows.length !== candidateIds.length) throw new Error('Some candidates not found');
    if (lockedRes.rows.some((c: any) => c.canonical_transaction_id)) throw new Error('Some candidates already reviewed');

    const totalAmount = lockedRes.rows.reduce((sum: number, c: any) => sum + safeParseNum(c.amount), 0);
    if (totalAmount <= 0) throw new Error('Invalid merged amount: must be greater than zero');
    const descriptions = lockedRes.rows.map((c: any) => c.description).filter(Boolean).join(' + ');

    const canonicalRes = await client.query(
      `INSERT INTO wa_canonical_transactions (status, transaction_type, amount, description, project_id, category, merged_from_candidates) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['confirmed', lockedRes.rows[0].candidate_type, totalAmount.toString(), descriptions || null, projectId, lockedRes.rows[0].category, JSON.stringify(candidateIds)]
    );
    const canonicalId = canonicalRes.rows[0].id;

    for (const c of lockedRes.rows) {
      await client.query(
        `UPDATE wa_extraction_candidates SET canonical_transaction_id = $1, match_status = 'new_entry' WHERE id = $2`,
        [canonicalId, c.id]
      );
    }

    await client.query(
      `INSERT INTO wa_review_actions (action_type, canonical_transaction_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['merge', canonicalId, reviewerId, JSON.stringify({ candidateIds }), JSON.stringify({ status: 'confirmed', totalAmount, projectId }), `Merged ${candidateIds.length} candidates`]
    );

    await client.query('COMMIT');
    return { canonicalId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function splitCandidate(
  candidateId: number,
  reviewerId: string,
  projectId: string,
  splits: { amount: string; description: string }[]
): Promise<{ canonicalIds: number[] }> {
  if (splits.length < 2) throw new Error('Need at least 2 splits');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedRes = await client.query(
      `SELECT * FROM wa_extraction_candidates WHERE id = $1 FOR UPDATE`,
      [candidateId]
    );
    if (lockedRes.rows.length === 0) throw new Error('Candidate not found');
    const c = lockedRes.rows[0];

    if (c.canonical_transaction_id) {
      const existingRes = await client.query(
        `SELECT * FROM wa_canonical_transactions WHERE id = $1 FOR UPDATE`,
        [c.canonical_transaction_id]
      );
      if (existingRes.rows.length > 0 && ['confirmed', 'posted'].includes(existingRes.rows[0].status || '')) {
        throw new Error('Candidate already confirmed/posted');
      }
    }

    const originalAmount = safeParseNum(c.amount);
    const splitTotal = splits.reduce((sum, s) => sum + safeParseNum(s.amount), 0);
    if (Math.abs(splitTotal - originalAmount) > 0.01) {
      throw new Error(`Split total (${splitTotal}) does not match original amount (${originalAmount})`);
    }

    const canonicalIds: number[] = [];

    for (const split of splits) {
      const splitAmount = safeParseNum(split.amount);
      if (splitAmount <= 0) throw new Error('Invalid split amount: must be greater than zero');

      const canonicalRes = await client.query(
        `INSERT INTO wa_canonical_transactions (status, transaction_type, amount, description, project_id, category, merged_from_candidates) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['confirmed', c.candidate_type, split.amount, split.description, projectId, c.category, JSON.stringify([candidateId])]
      );
      canonicalIds.push(canonicalRes.rows[0].id);
    }

    await client.query(
      `UPDATE wa_extraction_candidates SET canonical_transaction_id = $1, match_status = 'new_entry' WHERE id = $2`,
      [canonicalIds[0], candidateId]
    );

    await client.query(
      `INSERT INTO wa_review_actions (action_type, canonical_transaction_id, candidate_id, reviewer_id, before_state, after_state, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['split', canonicalIds[0], candidateId, reviewerId, JSON.stringify({ amount: c.amount, description: c.description }), JSON.stringify({ splits, canonicalIds }), `Split into ${splits.length} transactions`]
    );

    await client.query('COMMIT');
    return { canonicalIds };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
