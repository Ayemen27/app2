# WhatsApp Import — Review Dashboard & Posting Engine

## What & Why
Build the review dashboard for human verification of extracted transactions and the controlled posting engine that writes approved transactions to the ERP. This is the final gate — NO transaction enters the accounting system without explicit human approval. The posting engine must use existing FinancialLedgerService methods within database transactions to maintain double-entry ledger consistency and full auditability.

## Done looks like
- **Review dashboard page** at /wa-import with:
  - Import batch list with status indicators (pending/processing/completed)
  - Per-batch transaction list showing: date, amount, description, confidence score (color-coded), project assignment, match status, candidate type
  - Color coding: green (confirmed ≥0.90), yellow (needs review 0.70-0.89), red (conflict/duplicate), grey (excluded)
  - Inline editing: approve/reject individual transactions, change project assignment, edit amount/description, merge or split transactions
  - Reconciliation summary panel showing totals and delta per project
  - Batch-level bulk approve for items with confidence ≥0.95 and status=new_entry
  - Filter/sort by: project, status, confidence, date range, category, candidate type
  - All interactive elements have data-testid attributes
- **Immutable review audit trail** (wa_review_actions):
  - Every approve/reject/edit action logged with: reviewer_id, timestamp, before_state, after_state, notes
  - Cannot be deleted or modified after creation
  - Provides complete chain of custody for each transaction from extraction to posting
- **Posting engine** that:
  - Only processes approved (status=confirmed) canonical transactions
  - Routes to correct ERP table using atomic database transactions (withTransaction):
    - Structured transfers → fund_transfers + FinancialLedgerService.recordFundTransfer()
    - Materials (سمنت/حديد/خرسان) → material_purchases + FinancialLedgerService.recordMaterialPurchase()
    - Transport (بترول/مواصلت) → appropriate expense table + recordTransportExpense()
    - Labor (عمال/نجار/حداد) → worker expenses + recordMiscExpense()
    - Meals (صبوح/غداء/عشاء) → daily expense summaries
  - Each posting is atomic using existing WithClient methods: within a single withTransaction(client), call storage insert + FinancialLedgerService.recordFundTransferWithClient(client, ...) or recordMaterialPurchaseWithClient(client, ...) + insert wa_posting_results — all sharing the same client/transaction, rollback on any failure
  - Idempotent: checks wa_posting_results by idempotency_key before writing. Re-running = no duplicates.
  - Logs every posting action in financial_audit_log
  - Supports dry-run mode (preview what would be posted without writing, shows full posting plan)
  - RBAC: only admin role can trigger posting
- **Worker alias management UI** — view, add, edit, delete worker name aliases. Shows canonical name + all aliases + linked worker_id. data-testid on all interactive elements.
- **Custodian ledger view for ALL 3 custodians** — Tabbed/selectable view for each custodian:
  - عمار الشيعي: timeline of receipts/disbursements/settlements across all projects with running balance. Links to posted transactions. Separate section for personal-account entries.
  - عدنان محمد حسين حمدين (ابو فارس): الجراحي only. Show receipts, disbursements, unsettled amounts with "pending settlement" flag. No salary entries.
  - العباسي (عبداللة العباسي): temporary custodian period. Show receipts, disbursements, and تصفية (settlement) with final balance (should be zero after settlement).
- **Inter-contractor loan view** — shows identified loans between contractors with match status.

## Out of scope
- OCR on images (future enhancement)
- Audio transcription (future)
- Automated posting without human review (explicitly forbidden — architectural constraint)
- Mobile/Capacitor-specific UI (desktop-first)

## Tasks
1. **Build review dashboard page** — New React page at /wa-import. Show batch list, transaction list with filters (by status, project, confidence, type, date range), inline editing for transaction details and project assignment. Use existing shadcn components (Table, Badge, Button, Select, Dialog). Add data-testid attributes to all interactive and display elements.

2. **Build batch approval workflow** — UI for: bulk-approve high-confidence items (≥0.95 + new_entry), individual review with approve/reject/edit actions for medium confidence, forced review for conflicts and loans. Each action creates an immutable wa_review_actions record.

3. **Build atomic posting engine service** — WhatsAppPostingService that maps approved canonical transactions to ERP tables. For each transaction: use withTransaction(async (client) => { insert ERP record via client → call FinancialLedgerService.recordFundTransferWithClient(client, ...) or recordMaterialPurchaseWithClient(client, ...) for journal entries → insert wa_posting_results with idempotency_key via client → all in same transaction }). On failure: automatic rollback. Use safeParseNum from server/utils/safe-numbers.ts for all numeric conversions. The WithClient variants already exist in FinancialLedgerService (lines 480, 493).

4. **Build dry-run mode** — Preview mode that shows exactly what would be posted: target table, amounts, project, journal entry debits/credits. Returns full posting plan as JSON without any database writes. Requires admin role.

5. **Build reconciliation dashboard panel** — Visual summary per batch: status distribution chart, totals comparison (chat extracted vs matched vs posted), per-project breakdown for Jarahi and Tuhaita, highlight any delta > tolerance threshold. Show progress of review queue completion.

6. **Build worker alias management** — CRUD UI for managing worker name aliases. Show current mappings (alias → canonical worker name + ID), search workers to link, validate no duplicate aliases. data-testid on all elements.

7. **Build custodian ledger view for ALL 3 custodians** — Tabbed interface to select custodian (عمار الشيعي, عدنان/ابو فارس, العباسي). For each: timeline/table showing date, amount received, amount disbursed, settlement reference, running balance. Filter by date range. Highlight unsettled amounts. For عدنان: show "pending settlement" and "بدون عمل" flags. For العباسي: show تصفية with zero-balance confirmation. Link disbursements to their posted transactions. data-testid on all elements.

8. **Build inter-contractor loan view** — Table showing identified loans: date, amount, from_contractor, to_contractor, matched_status (balanced/unbalanced), linked transactions.

9. **Add navigation and integration** — Add wa-import to sidebar navigation with appropriate icon. Ensure auth guards (admin/editor for view, admin for posting). Register page route in App.tsx.

## MANDATORY: Post-Task Completion Checklist
Before marking this task complete, the agent MUST:
1. Update `wa-import-plans/PROGRESS.md` with completion entries for ALL 9 sub-tasks
2. Read `wa-import-plans/SCHEMA_CONTRACT.md` and verify all enums/types match exactly
3. Verify review dashboard renders at /wa-import with all panels
4. Verify approve/reject/edit actions work and are logged in wa_review_actions (immutable)
5. Verify posting engine uses WithClient methods within withTransaction (atomic)
6. Verify RBAC: admin/editor can view, admin-only can post
7. Verify custodian views show correct running balances for all 3 custodians
8. Verify navigation is integrated in sidebar
9. Run end-to-end test: upload ZIP → extract → dedup → review → approve → post → verify ledger
10. Call `architect()` for POST-TASK GATE REVIEW (see Rule 9 in 00-continuity-guide.md)
11. If architect PASS (≥8/10) → mark complete. If FAIL → fix issues and re-review (max 3 rounds)
12. Log architect review result in PROGRESS.md

## Relevant files
- `client/src/App.tsx`
- `client/src/pages/`
- `server/routes/modules/financialRoutes.ts`
- `server/services/FinancialLedgerService.ts`
- `server/storage.ts`
- `shared/schema.ts`
- `server/utils/safe-numbers.ts`
