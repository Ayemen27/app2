# WhatsApp Import — Dedup, Matching & Reconciliation

## What & Why
Build the critical dedup engine and historical matching system. This is the MOST DANGEROUS phase — it must prevent duplicate entries and correctly match extracted transactions against the 110+ existing fund_transfers and 155+ existing material_purchases already manually entered. Wrong matching = financial data corruption. The system uses fingerprinting, confidence scoring, and mandatory human review for conflicts. Matching covers ALL target ERP tables, not just fund_transfers and material_purchases.

## Done looks like
- **Dedup engine**: Prevents the same transaction from being counted twice when it appears as text + image + confirmation in the chat. Uses composite fingerprint: (normalized_amount + date + direction + counterparty + transfer_number_if_available + image_hash_if_available). For structured transfers, رقم الحوالة is the primary dedup key (guaranteed unique).
- **Historical matcher covering all ERP tables**:
  - fund_transfers (110+ records): match by transfer_number (exact) OR amount+sender_name+date (±1 day)
  - material_purchases (155+ records): match by amount+supplier_name_similarity+date (±2 days)+material_description
  - worker_attendance/worker_misc_expenses: match by worker_id+date+amount
  - transportation_expenses: match by amount+date+description
  - Classification per candidate: exact_match (skip) / near_match (review) / conflict (flag) / new_entry (proceed)
- **Custodian reconciliation for ALL 3 custodians**:
  - عمار الشيعي: Track receipts, disbursements, settlements across ALL projects. Handle "personal account" entries separately.
  - عدنان محمد حسين حمدين (ابو فارس): Track receipts and disbursements for الجراحي ONLY. No salary — unsettled amounts stay on his account with "pending settlement" flag. Amounts without details → fund_transfer.
  - العباسي (عبداللة العباسي): Track his temporary custodian period with زين. Parse his تصفية (settlement) message as final reconciliation of his عهدة. After settlement, his balance should be zero.
  - Per-custodian statement: total_received, total_disbursed, total_settled, unsettled_balance.
- **Inter-contractor loan reconciliation**: Match loans between contractors. Ensure both sides (lending and borrowing) are recorded. Flag unmatched loans.
- **Reconciliation report per batch**:
  - Total chat amounts (sum of all extracted candidates)
  - Total matched to existing records
  - Total new entries (not in existing data)
  - Total conflicts (mismatched data)
  - Total excluded (non-transactions)
  - Unresolved delta (should be small, not necessarily zero — allow configurable tolerance threshold, default 1% of total)
- **Carpenter debt aggregation rule**: Flag any expenses attributed to محمد حسن نجار (d9f327e5) in الجراحي project for mandatory review — عمار الشيعي entered other carpenters' debts under محمد حسن's account. These may need reclassification to the actual carpenter (بدر نجار الجراحي, نجار الجراحي, etc.). Add review reason: "possible_aggregated_carpenter_debt".
- **Verification queue**: Candidates routed to mandatory review when: confidence < 0.85, status = conflict/near_match, project inference confidence < 0.80, amount > 100,000 YER, type = loan or personal_account or settlement, worker alias ambiguity detected, محمد حسن نجار aggregation anomaly detected.
- **Non-posting guarantee**: NOTHING writes to the ERP ledger tables. Only writes to staging tables (wa_canonical_transactions, wa_verification_queue). Posting is Task #4.

## Out of scope
- Actual posting to fund_transfers/material_purchases/journal_entries (Task #4)
- Review dashboard UI (Task #4)
- Audio/Excel analysis (future)

## Tasks
1. **Build fingerprint engine** — Generate deterministic fingerprints for each candidate. For structured transfers: use رقم الحوالة as primary key. For cash expenses: hash of normalized(amount + date + first_20_chars_description). For clustered transactions: use the cluster's primary evidence fingerprint. Store fingerprints in wa_dedup_keys for cross-batch dedup. CRITICAL: Use WhatsApp message timestamp (not inline dates from العباسي) when computing fingerprints, since العباسي's inline dates are unreliable.

2. **Build cross-chat dedup engine** — The pipeline processes TWO chat exports (زين + العباسي) that reference the SAME transactions (same حوالة numbers, same amounts). For example, a 30000 حوالة from زين appears in both chats. Cross-chat dedup uses: transfer_number (exact match), amount+date±1day+counterparty_context. Mark as single transaction with evidence from both chats.

NOTE: Message-level duplicate text block detection is owned by Task #2 (Rule 8). Task #3 only handles TRANSACTION-level dedup of extracted candidates.

3. **Build historical matcher for fund_transfers** — Query existing 110+ fund_transfers across 4 projects. Match by: transfer_number (exact match = skip), or amount+sender_name+date±1day (near match = review). IMPORTANT: Same رقم الحوالة = always the SAME transaction (primary dedup key, guaranteed unique). Different transfer numbers with same amount on different dates = SEPARATE valid transactions.

4. **Build historical matcher for material_purchases** — Query existing 155 material_purchases. Match by: amount+supplier_name_similarity(>0.8)+date±2days. Handle same supplier with different name spellings using worker alias system. Use fuzzy string matching for Arabic names.

5. **Build historical matcher for other ERP tables** — Match against worker_attendance (worker_id+date+amount), transportation_expenses (amount+date+description), worker_misc_expenses. Ensure comprehensive coverage of all expense destinations.

6. **Build custodian ledger reconciliation for ALL 3 custodians** — For each custodian (عمار الشيعي, عدنان/ابو فارس, العباسي): match fund receipts to subsequent disbursements, calculate total_received/total_disbursed/total_settled/unsettled_balance. For عمار: separate personal-account entries. For عدنان: mark unsettled as "pending settlement" with "بدون عمل" flag. For العباسي: parse تصفية message as final settlement — his balance after settlement should be zero. Generate per-custodian statement per batch.

7. **Build محمد حسن نجار aggregation detector** — Flag all expenses under محمد حسن نجار (d9f327e5) in الجراحي project for review. Compare against known carpenters in الجراحي (بدر نجار الجراحي 8f1dc035, نجار الجراحي 1c7ab56f, نجار الجراحي رقم 2 a95b1744, مساعد نحار الجراحي 28b939fb). Add review reason "possible_aggregated_carpenter_debt" for human decision on reclassification.

8. **Build inter-contractor loan reconciler** — Match identified loans between contractors. Cross-reference with the other contractor's project data. Flag unbalanced loans for manual review.

9. **Build reconciliation report generator** — Per-batch summary with configurable tolerance (default 1%). Show breakdown by category, project, and match status. Highlight any delta > tolerance. Include per-project sub-totals for Jarahi and Tuhaita.

10. **Build verification queue populator with priority scoring** — Route candidates to review queue. Priority scoring: P1 (critical) = conflicts + high-value (>500K YER), P2 (high) = near_matches + loans, P3 (medium) = low confidence + ambiguous project, P4 (low) = minor discrepancies. Store routing reason for reviewer context.

## MANDATORY: Post-Task Completion Checklist (10 implementation sub-tasks: #1 through #10, plus verification steps below)
Before marking this task complete, the agent MUST:
1. Update `wa-import-plans/PROGRESS.md` with completion entries for ALL 10 sub-tasks
2. Read `wa-import-plans/SCHEMA_CONTRACT.md` and verify all enums/types match exactly
3. Verify fingerprint engine produces deterministic results (same input = same fingerprint)
4. Verify cross-chat dedup correctly merges transactions appearing in both زين and العباسي chats
5. Verify historical matching runs against existing fund_transfers (110+) and material_purchases (155+)
6. Verify custodian reconciliation works for all 3 custodians with correct balances
7. Verify محمد حسن نجار aggregation flagging works
8. Verify verification queue is populated with correct priority scoring
9. Call `architect()` for POST-TASK GATE REVIEW (see Rule 9 in 00-continuity-guide.md)
10. If architect PASS (≥8/10) → mark complete. If FAIL → fix issues and re-review (max 3 rounds)
11. Log architect review result in PROGRESS.md

## Relevant files
- `shared/schema.ts`
- `server/storage.ts`
- `server/services/FinancialLedgerService.ts`
- `server/services/SummaryRebuildService.ts`
- `server/utils/safe-numbers.ts`
