# WhatsApp Import — Dedup, Matching & Reconciliation

## What & Why
Build the critical dedup engine and historical matching system. This is the MOST DANGEROUS phase — it must prevent duplicate entries and correctly match extracted transactions against the 68+42 existing fund_transfers and 78+77 existing material_purchases already manually entered. Wrong matching = financial data corruption. The system uses fingerprinting, confidence scoring, and mandatory human review for conflicts. Matching covers ALL target ERP tables, not just fund_transfers and material_purchases.

## Done looks like
- **Dedup engine**: Prevents the same transaction from being counted twice when it appears as text + image + confirmation in the chat. Uses composite fingerprint: (normalized_amount + date + direction + counterparty + transfer_number_if_available + image_hash_if_available). For structured transfers, رقم الحوالة is the primary dedup key (guaranteed unique).
- **Historical matcher covering all ERP tables**:
  - fund_transfers (110 records): match by transfer_number (exact) OR amount+sender_name+date (±1 day)
  - material_purchases (155 records): match by amount+supplier_name_similarity+date (±2 days)+material_description
  - worker_attendance/worker_misc_expenses: match by worker_id+date+amount
  - transportation_expenses: match by amount+date+description
  - Classification per candidate: exact_match (skip) / near_match (review) / conflict (flag) / new_entry (proceed)
- **Custodian reconciliation**: Track all amounts received by عمار الشيعي as custodian. Match settlements against disbursements. Calculate running balance. Flag unsettled amounts. Handle "personal account" entries separately.
- **Inter-contractor loan reconciliation**: Match loans between contractors. Ensure both sides (lending and borrowing) are recorded. Flag unmatched loans.
- **Reconciliation report per batch**:
  - Total chat amounts (sum of all extracted candidates)
  - Total matched to existing records
  - Total new entries (not in existing data)
  - Total conflicts (mismatched data)
  - Total excluded (non-transactions)
  - Unresolved delta (should be small, not necessarily zero — allow configurable tolerance threshold, default 1% of total)
- **Verification queue**: Candidates routed to mandatory review when: confidence < 0.85, status = conflict/near_match, project inference confidence < 0.80, amount > 100,000 YER, type = loan or personal_account, worker alias ambiguity detected.
- **Non-posting guarantee**: NOTHING writes to the ERP ledger tables. Only writes to staging tables (wa_canonical_transactions, wa_verification_queue). Posting is Task #4.

## Out of scope
- Actual posting to fund_transfers/material_purchases/journal_entries (Task #4)
- Review dashboard UI (Task #4)
- Audio/Excel analysis (future)

## Tasks
1. **Build fingerprint engine** — Generate deterministic fingerprints for each candidate. For structured transfers: use رقم الحوالة as primary key. For cash expenses: hash of normalized(amount + date + first_20_chars_description). For clustered transactions: use the cluster's primary evidence fingerprint. Store fingerprints in wa_dedup_keys for cross-batch dedup.

2. **Build historical matcher for fund_transfers** — Query existing 110 fund_transfers across 4 projects. Match by: transfer_number (exact match = skip), or amount+sender_name+date±1day (near match = review). Handle duplicate transfer numbers from different dates as separate valid transactions.

3. **Build historical matcher for material_purchases** — Query existing 155 material_purchases. Match by: amount+supplier_name_similarity(>0.8)+date±2days. Handle same supplier with different name spellings using worker alias system. Use fuzzy string matching for Arabic names.

4. **Build historical matcher for other ERP tables** — Match against worker_attendance (worker_id+date+amount), transportation_expenses (amount+date+description), worker_misc_expenses. Ensure comprehensive coverage of all expense destinations.

5. **Build custodian ledger reconciliation** — Track all amounts sent to/through عمار الشيعي. Match fund receipts to subsequent disbursements. Calculate: total_received, total_disbursed, total_settled, unsettled_balance. Separate personal-account entries. Generate custodian statement per batch.

6. **Build inter-contractor loan reconciler** — Match identified loans between contractors. Cross-reference with the other contractor's project data. Flag unbalanced loans for manual review.

7. **Build reconciliation report generator** — Per-batch summary with configurable tolerance (default 1%). Show breakdown by category, project, and match status. Highlight any delta > tolerance. Include per-project sub-totals for Jarahi and Tuhaita.

8. **Build verification queue populator with priority scoring** — Route candidates to review queue. Priority scoring: P1 (critical) = conflicts + high-value (>500K YER), P2 (high) = near_matches + loans, P3 (medium) = low confidence + ambiguous project, P4 (low) = minor discrepancies. Store routing reason for reviewer context.

## Relevant files
- `shared/schema.ts`
- `server/storage.ts`
- `server/services/FinancialLedgerService.ts`
- `server/services/SummaryRebuildService.ts`
- `server/utils/safe-numbers.ts`
