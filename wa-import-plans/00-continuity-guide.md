# WhatsApp Import Pipeline — Continuity & Recovery Guide

## Purpose
This file ensures ANY agent (current or future) can resume work on this pipeline from any point. It contains all business context, database state, naming mappings, and task dependencies needed to continue without re-discovery.

## Pipeline Overview
Import exported WhatsApp conversations (Arabic, Yemeni dialect) and convert them into structured financial entries in the existing Axion ERP system. NO direct posting to ledger without human approval.

## Task Chain (Sequential Dependencies)
```
Task #1: Schema & Ingestion → Task #2: Extraction Engine → Task #3: Dedup & Matching → Task #4: Review Dashboard & Posting → Task #5: AI Learning Engine → Task #6: Interactive Clarification
```
Tasks 1-4 are the core pipeline (sequential). Tasks 5-6 are enhancement layers that depend on Tasks 1-4 but can be built independently of each other.
Each task MUST be completed and verified before dependent tasks can begin. A task is "complete" when all its acceptance criteria pass and the app starts without errors.

## How to Resume If Agent Stops Mid-Task

### Step 0: Verify Plan Files Sync (MANDATORY FIRST ACTION)
Before ANY other work, the agent MUST verify that plan files are synchronized between the source directory and the task system:

```bash
# Auto-sync: copies ANY missing or changed files from source to task system
mkdir -p .local/tasks
for f in 00-continuity-guide.md 01-schema-ingestion.md 02-extraction-engine.md 03-dedup-matching.md 04-review-posting.md 05-ai-learning-engine.md 06-interactive-clarification.md; do
  if [ -f "wa-import-plans/$f" ]; then
    if [ ! -f ".local/tasks/$f" ] || ! diff -q "wa-import-plans/$f" ".local/tasks/$f" > /dev/null 2>&1; then
      cp "wa-import-plans/$f" ".local/tasks/$f"
      echo "SYNCED: $f (copied to .local/tasks/)"
    else
      echo "OK: $f (already in sync)"
    fi
  else
    echo "WARNING: $f missing from wa-import-plans/"
  fi
done
```

After running the sync script above, for each file that was SYNCED (not OK), the agent MUST also update the project task:
```javascript
// Only for task files (not 00-continuity-guide.md which is a shared reference)
await updateProjectTask({ taskRef: "#N", filePath: ".local/tasks/<filename>" });
```
Then log all sync actions in PROGRESS.md.

**Source of truth**: `wa-import-plans/` is the authoritative source. `.local/tasks/` is the task system copy. If conflict, `wa-import-plans/` wins.

**File mapping:**
| Source File | Task |
|---|---|
| `00-continuity-guide.md` | Shared reference (not a task) |
| `01-schema-ingestion.md` | Task #1 |
| `02-extraction-engine.md` | Task #2 |
| `03-dedup-matching.md` | Task #3 |
| `04-review-posting.md` | Task #4 |
| `05-ai-learning-engine.md` | Task #5 |
| `06-interactive-clarification.md` | Task #6 |

Only proceed to Step 1 after sync is confirmed.

### Step 1: Identify Current State
Run these checks:
```sql
-- Check if wa_import tables exist
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'wa_%' ORDER BY table_name;
```
Then use agent tools to verify files:
- Use glob tool with pattern `server/services/whatsapp-import/**/*` to check if services exist
- Use grep tool to search for `wa-import` in `server/routes/` to check if routes exist
- Use glob tool with pattern `client/src/pages/wa-import/**/*` to check if frontend page exists

### Step 2: Determine Which Task to Resume
| If you see... | Status | Resume from |
|---|---|---|
| No wa_* tables | Task #1 not started | Start Task #1 from beginning |
| wa_* tables exist but no WhatsAppParserService | Task #1 partially done | Continue Task #1, check which sub-tasks are done |
| Parser exists but no ExtractionEngine | Task #1 complete, #2 not started | Start Task #2 |
| ExtractionEngine exists but no DedupService | Task #2 complete, #3 not started | Start Task #3 |
| DedupService exists but no ReviewDashboard page | Task #3 complete, #4 not started | Start Task #4 |
| Review page exists but no PostingEngine | Task #4 partially done | Continue Task #4 |
| Everything exists and compiles | All tasks complete | Verify and test |

### Step 3: Read the Progress Log
Check `wa-import-plans/PROGRESS.md` — this file is MANDATORY and tracks exactly what was done, what's pending, and any issues encountered.

### Step 4: Read the Relevant Task Plan
Plans are in this directory:
- `wa-import-plans/01-schema-ingestion.md`
- `wa-import-plans/02-extraction-engine.md`
- `wa-import-plans/03-dedup-matching.md`
- `wa-import-plans/04-review-posting.md`

### Step 5: Check What's Already Built
Use the glob tool to search for files:
- Pattern `server/services/whatsapp-import/**/*` — list all backend import service files
- Pattern `client/src/pages/wa-import/**/*` — list all frontend import page files
- Use the grep tool to search for `wa_` in `shared/schema.ts` to see defined tables

---

## MANDATORY DOCUMENTATION RULES FOR ALL AGENTS

These rules are NON-NEGOTIABLE. Every agent working on this pipeline MUST follow them.

### Rule 1: Update PROGRESS.md After Every Sub-Task
File: `wa-import-plans/PROGRESS.md`
After completing EACH numbered sub-task within a task plan, the agent MUST update PROGRESS.md with:
```markdown
### [Task#]-[SubTask#]: [Title]
- **Status**: DONE / IN_PROGRESS / BLOCKED / FAILED
- **Date**: YYYY-MM-DD HH:MM
- **Files Created/Modified**:
  - path/to/file1.ts — description of what was added
  - path/to/file2.ts — description of what was changed
- **Key Decisions Made**: (any design choices not in the plan)
- **Issues Encountered**: (any problems and how they were resolved)
- **Tests Passing**: YES / NO / NOT_YET
- **Next Step**: what the next agent should do if this agent stops
```

### Rule 2: Never Delete or Overwrite Previous Progress Entries
PROGRESS.md is append-only. New entries go at the bottom. Never delete previous agent's entries.

### Rule 3: Mark Blockers Explicitly
If something cannot be completed, write a BLOCKER entry:
```markdown
### BLOCKER: [Description]
- **Blocking Task**: Task#X Sub-task #Y
- **Reason**: [why it's blocked]
- **What's Needed**: [what must happen to unblock]
- **Workaround Attempted**: [if any]
```

### Rule 4: Verify Before Marking Done
Before marking any sub-task as DONE:
1. The app must compile without errors (`npm run dev` starts successfully)
2. New tables must exist in the database (verify with SQL query)
3. New API endpoints must respond (verify with curl or test)
4. New UI pages must render (verify with screenshot or test)

### Rule 5: Handoff Summary on Stop/Pause
If an agent stops mid-task (timeout, error, user request), it MUST write a handoff entry:
```markdown
### HANDOFF — [Date/Time]
- **Current Task**: Task #X, Sub-task #Y
- **What's Done**: [list of completed items]
- **What's In Progress**: [current work, state of files]
- **What's Left**: [remaining sub-tasks]
- **Known Issues**: [any bugs or problems]
- **Critical Context**: [anything the next agent needs to know that isn't in the plan]
```

### Rule 6: Schema Contract File
After Task #1 creates the 13 tables, a schema contract file MUST be created at:
`wa-import-plans/SCHEMA_CONTRACT.md`
This file lists:
- Every table name with its columns and types
- Every enum with its exact values
- This is the SINGLE SOURCE OF TRUTH for all downstream tasks

### Rule 7: Canonical Enum Definitions (SINGLE SOURCE OF TRUTH)
These enums MUST be used consistently across ALL files, services, and UI:

**candidate_type**: `expense` | `transfer` | `loan` | `personal_account` | `custodian_receipt` | `settlement`

**canonical_transaction_status**: `confirmed` | `doubtful` | `duplicate` | `unclassified` | `excluded`

**batch_status**: `pending` | `processing` | `completed` | `failed`

**chat_source**: `zain` | `abbasi` | `other`

**verification_priority**: `P1_critical` | `P2_high` | `P3_medium` | `P4_low`

**review_decision**: `approved` | `rejected` | `edited` | `merged` | `split` | `reclassified`

**posting_target_table**: `fund_transfers` | `material_purchases` | `worker_misc_expenses` | `transportation_expenses` | `daily_expense_summaries`

**match_status**: `exact_match` | `near_match` | `conflict` | `new_entry`

**media_status**: `processed` | `skipped_too_large` | `skipped_unsupported` | `error`

**posting_status**: `success` | `failed` | `skipped_duplicate`

**date_mismatch_reason**: `wrong_day_name` | `wrong_date` | `wrong_year` | `wrong_month` | `multi_day_discrepancy` | `date_mismatch_whatsapp_vs_inline`

### Rule 8: Task Ownership for Duplicate Detection
- **Task #2 owns**: Message-level duplicate text block detection (same sender, same text, ≤30 min). Collapses duplicates BEFORE extraction.
- **Task #3 owns**: Transaction-level dedup (fingerprinting, cross-chat matching, historical matching). Works on extracted candidates AFTER Task #2.
- There is NO overlap. Task #2 deduplicates RAW MESSAGES. Task #3 deduplicates EXTRACTED CANDIDATES.

### Rule 9: MANDATORY Architect Review After Each Task (GATE — Cannot Skip)
After completing ALL sub-tasks within a task, the agent MUST call the architect for a full review BEFORE marking the task as complete.

**Procedure:**
1. Agent finishes all sub-tasks within the task plan
2. Agent updates PROGRESS.md with all completion entries
3. Agent calls `architect()` with:
   ```
   architect({
     task: "POST-TASK GATE REVIEW — Task #X: [Title]. Verify: (1) all sub-tasks implemented, (2) schema contract followed, (3) enum consistency with Rule 7, (4) no regressions in existing ERP, (5) code quality, (6) PROGRESS.md updated, (7) all tests passing. Score 1-10, PASS/FAIL.",
     relevantFiles: [all files created/modified in this task],
     includeGitDiff: true
   })
   ```
4. If architect returns **PASS (≥8/10)**: Agent marks task complete in PROGRESS.md and notifies user
5. If architect returns **FAIL (<8/10)**: Agent MUST fix ALL issues identified by architect, then re-run the review
6. Maximum 3 review rounds — if still failing after 3 rounds, write a BLOCKER entry and escalate to user

**What the Architect Checks Per Task:**
- **Task #1**: 13 tables created, enums match Rule 7, parser handles both chat formats (زين+العباسي), worker aliases seeded, custodian entries table works, API endpoints respond, SCHEMA_CONTRACT.md created
- **Task #2**: All 6 patterns + 4 special types extract correctly, confidence rubric matches exact values, date validation engine works for العباسي, duplicate text block detection works, categorization is correct
- **Task #3**: Fingerprinting is deterministic, cross-chat dedup works, historical matching against existing 110+ transfers and 155+ purchases, custodian reconciliation for all 3, carpenter aggregation flagging, verification queue populated correctly
- **Task #4**: Review dashboard renders, all CRUD actions work, posting engine uses WithClient methods within withTransaction, audit trail is immutable, RBAC enforced, custodian views show correct balances, navigation integrated

**Architect Review Results Are Logged:**
After each architect review, append the result to PROGRESS.md:
```markdown
### ARCHITECT REVIEW — Task #X, Round Y
- **Score**: X/10
- **Verdict**: PASS / FAIL
- **Issues Found**: [list]
- **Issues Fixed**: [list, if re-review]
```

### Rule 10: Transfer Company Parser Coverage
All 3 transfer companies MUST have explicit parser rules:
| Company | Format | Regex Pattern |
|---|---|---|
| شركه رشاد بحير | Structured multi-line receipt | رقم الحوالة followed by digits |
| الحوشبي | 12-digit transfer number | `رقم\s*:?\s*(202\d{9})` |
| النجم | Variable format | `رقم\s*:?\s*(\d{6,12})` with company name النجم in context |
Each parser extracts: transfer_number, amount, fee (if available), sender_name, recipient_name, date, company_name. All three parsers share the same TransferReceiptResult output schema for uniform downstream processing.

شركه رشاد بحير regex pattern: Multi-line block starting with company name, fields on separate lines:
- `مبلغ\s*الحوالة\s*:?\s*([\d,٠-٩,]+)` for amount
- `رقم\s*الحوالة\s*:?\s*([\d٠-٩]+)` or `الرقم\s*العام\s*:?\s*([\d٠-٩]+)` for transfer number
- `المستلم\s*:?\s*(.+)` for recipient
- `المرسل\s*:?\s*(.+)` for sender

### Rule 11: Failure Semantics & Edge Cases (MANDATORY)
Every implementation MUST handle these edge cases explicitly. Silent failures are FORBIDDEN — all edge cases must either reject with error or flag for human review.

**Amount Edge Cases:**
- **Zero amounts (0 or ٠)**: REJECT — log warning "zero_amount_rejected", do NOT create candidate. Zero-amount transactions are data entry errors.
- **Negative amounts**: REJECT — log warning "negative_amount_rejected". All amounts must be positive. If a refund/correction is detected (keywords: إرجاع, تعديل, خصم), create candidate with candidate_type="expense" and add review_flag="possible_refund_or_correction" for human review.
- **Amounts exceeding 10,000,000 YER**: FLAG for mandatory human review with reason "unusually_large_amount". Do NOT auto-process.
- **Amounts below 100 YER**: FLAG for review with reason "unusually_small_amount" — likely data entry error.
- **All numeric conversions**: MUST use `safeParseNum` from `server/utils/safe-numbers.ts`. This applies to: extraction engine, confidence scoring, custodian balances, reconciliation totals, posting amounts. NO EXCEPTIONS.

**ZIP/File Edge Cases:**
- **Corrupt ZIP**: Catch extraction error, mark batch as `failed` with error message, do NOT partially process.
- **Empty ZIP (no TXT file)**: Mark batch as `failed` with reason "no_chat_txt_found".
- **ZIP with multiple TXT files**: Process each TXT as a separate sub-batch within the same import batch, but flag for review.
- **Duplicate ZIP upload**: Compute SHA256 of the ZIP file. If identical SHA256 exists in wa_import_batches, REJECT with "duplicate_zip_already_imported" and reference the existing batch_id. Do NOT re-process.
- **ZIP-slip attack**: Validate all extracted paths are within the target directory. Reject any path containing `..` or absolute paths.
- **Media files >50MB**: Skip the file, log warning "media_file_too_large", continue processing other files. Link a placeholder record in wa_media_assets with status="skipped_too_large".

**Message Edge Cases:**
- **Messages without timestamps**: Skip the message, log warning "message_no_timestamp". Do NOT attempt to extract financial data from undated messages — dates are critical for financial records.
- **Messages with only media (no text)**: Store in wa_raw_messages with empty text. Link media. Do NOT extract candidates from image-only messages (no OCR in current scope).
- **System messages (encryption notices, group changes)**: Filter out completely, do NOT store in wa_raw_messages.

**Posting/Crash Recovery:**
- **Posting engine crash mid-transaction**: `withTransaction` ensures automatic rollback. The canonical_transaction status remains "confirmed" (not "posted"). The agent can retry posting.
- **Idempotent posting**: Before posting, check if wa_posting_results already has an entry for this canonical_transaction_id with posting_status='success'. If yes, insert wa_posting_results with posting_status='skipped_duplicate' + error_message='already_posted' for audit trail, then return WITHOUT posting (auditable skip — never silent). Failed attempt rows (posting_status='failed') do NOT block retries — only success rows trigger the skip. Retry scenario: fail → log failed attempt → retry → pre-check finds no success row → posts → succeeds exactly once. Duplicate re-run scenario: success exists → log skipped_duplicate → return.
- **Partial batch failure**: If posting fails for some transactions in a batch, mark failed ones as posting_status='failed' with error message, continue with remaining. Do NOT rollback successful postings.

### Rule 12: Match Status Enum (for dedup/historical matching)
**match_status**: `exact_match` | `near_match` | `conflict` | `new_entry`

Semantics (AUTHORITATIVE — all files must follow this):
- `exact_match`: Transaction already exists in ERP (same transfer number or identical fingerprint). Action: Create candidate row WITH match_status='exact_match', but automatically set canonical_transaction status to 'excluded' with reason 'already_in_erp'. The candidate EXISTS for audit trail but is NOT posted. This preserves the evidence chain (Rule 13) while preventing double-posting.
- `near_match`: Similar transaction found (amount+date close but not identical). Action: Create candidate with match_status='near_match', flag for human review at P2_high priority.
- `conflict`: Contradicting data found (same transfer number but different amount). Action: Create candidate with match_status='conflict', flag as P1_critical for mandatory review.
- `new_entry`: No matching transaction in ERP. Action: Create candidate with match_status='new_entry', proceed to confidence scoring and normal review flow.

### Rule 13: Evidence Chain FK Contract (Referential Integrity)
The full evidence chain MUST maintain referential integrity through foreign keys:
```
wa_raw_messages (source) 
  → wa_transaction_evidence_links (many-to-many bridge)
    → wa_extraction_candidates (extracted items)
      → wa_canonical_transactions (deduped final)
        → wa_posting_results (posted to ERP)
          → wa_review_actions (audit trail, links to canonical_transaction_id)

wa_media_assets → wa_transaction_evidence_links (images/receipts linked to candidates)
wa_worker_aliases → wa_extraction_candidates (resolved worker identity)
wa_project_hypotheses → wa_extraction_candidates (project assignment)
wa_dedup_keys → wa_extraction_candidates (fingerprint source, via candidate_id)
wa_dedup_keys → wa_canonical_transactions (post-dedup link, via canonical_transaction_id, nullable until Task #3 sets it)
wa_custodian_entries → wa_canonical_transactions (custodian tracking)
wa_verification_queue → wa_canonical_transactions (review routing)
```
Every record in wa_posting_results MUST trace back to a wa_raw_message through this chain. If any link is broken, the posting engine MUST refuse to post with error "broken_evidence_chain".

## CRITICAL: Database Entity Mappings (Exact IDs from Production)

### Projects (6 total, 4 relevant to WhatsApp chat)
| Project ID | Name | Relevant to Chat |
|---|---|---|
| `6c9d8a97-179a-4a76-b09e-14702445b693` | مشروع ابار الجراحي زين العابدين أخو ابرهيم | YES — primary (chat is WITH زين) |
| `7212655c-d8c7-4250-8347-a5768cf75c0d` | مشروع ابار التحيتا المرحلة الثانية زين العابدين أخو ابرهيم | YES — primary (chat is WITH زين) |
| `00735182-397d-4d04-8205-d3e11f1dec77` | ابار الجراحي المهندس محمد | YES — secondary (زين's brother's projects) |
| `b23ad9a5-bed2-43c7-8193-2261c76358cb` | ابار التحيتا المهندس محمد | YES — secondary (زين's brother's projects) |
| `760cea48-5533-4d8a-802c-c91b40c9ac0c` | المهندس ماهر المجهلي | NO |
| `507017b9-4f62-49c5-9ef4-8d18e9baf3e3` | مشروع مطعم الخطيب جولة 45 | NO |

### Key Personnel & Roles
| Name in Chat | Name in DB | Worker ID | Role |
|---|---|---|---|
| عمار / المهندس عمار | عمار الشيعي | `w002-عمار` | Primary Custodian (أمين عهدة) — receives & disburses funds for ALL projects |
| عدنان / ابو فارس | NOT IN DB — must be created as "عدنان محمد حسين حمدين" | N/A | Volunteer supervisor (مشرف متطوع) at الجراحي ONLY. Beneficiary from wells project (مستفيد من كشف الابار). Receives funds and disburses on-site. Does NOT receive salary. Unsettled amounts on his account until cleared. |
| العباسي / عبداللة العباسي | NOT IN DB — must be created | N/A | Worker. Temporarily acted as supervisor with زين العابدين — received عهدة and disbursed to workers. Sent settlement (تصفية) via WhatsApp chat. DIFFERENT from عبدالله عمر يوسف. |
| زين العابدين / زين | (contractor, not a worker) | N/A | Contractor — concrete foundations & materials. Chat counterparty. |
| المهندس محمد / محمد الفتيني | (contractor, not a worker) | N/A | Contractor — platform/panel installation. Brother of زين. |
| زين صالح الفتيني | (same family) | N/A | Brother of المهندس محمد الفتيني (the contractor) |

### Workers Who Must Be Created During Setup
1. **عدنان محمد حسين حمدين** — volunteer supervisor الجراحي, alias: ابو فارس
2. **عبداللة العباسي** — worker, temporary supervisor with زين

### Worker Aliases (Names in Chat → Canonical DB Records)
| Alias in Chat | Canonical Name in DB | Worker ID | Notes |
|---|---|---|---|
| النخرة | سمهرير | `6066edb5-8774-4d78-a459-b538fc49fa9f` | |
| عمي احمد | الحج احمد | `51165865-8406-4499-a020-2e71d8a5f78b` | |
| سعيد | سعيد الحداد | `w004-سعيد` | |
| عبدالله الخلاطة | عبدالله سواق الخلاطة | `47f0c37a-a6fd-46d6-a02b-cc2fb5523163` | |
| عمال الحفر | عمال حفر | `1389a5ea-a685-4bd2-9e8d-88ea87f0abad` | Group worker |
| عمال الصبة | عمال الصبة | `2943956a-ef00-4993-b3d1-dde7ffbe7cc9` | Group worker |
| نجار باجل | نجار من باجل | `78c1e5ab-0d39-441b-9053-76d6df68aa93` | |
| ناجي / ناجي المساعد | ناجي مساعد نحار | `0350b938-bfee-4022-8a89-c3b93a427555` | Carpenter assistant |
| حسن النجار / حسن | محمد حسن نجار | `d9f327e5-bc42-4305-ad06-046d12ca6fb6` | Carpenter, worked in الجراحي and التحيتا |
| ابو فارس | عدنان محمد حسين حمدين | (to be created) | Volunteer supervisor |

### Custodian Fund Handling Rules
1. **عمار الشيعي** — full custodian (أمين عهدة). All unspecified amounts = fund_transfers. Settlement messages contain itemized disbursements.
2. **عدنان (ابو فارس)** — volunteer, NO salary. If amount has no details → register as fund_transfer (حوالة دخل). Unsettled amounts → register as expense on his account with note "pending settlement" (حتى يتم تصفيته). Record reason why it's on his account. Mark as "بدون عمل" (no work performed for payment).
3. **العباسي** — temporary custodian during specific period with زين. Sent settlement (تصفية) in chat. Handle settlement message as final reconciliation of his عهدة.

### Carpenter Debt Note (Important)
عمار الشيعي, when managing funds in الجراحي, entered carpenter debts under محمد حسن نجار's account (worker ID: d9f327e5-bc42-4305-ad06-046d12ca6fb6). This may affect reconciliation — some expenses attributed to محمد حسن may actually be for other carpenters in الجراحي (بدر نجار الجراحي, نجار الجراحي, نجار الجراحي رقم 2, مساعد نحار الجراحي, etc.).

### Existing Financial Records (For Dedup Matching)
| Table | Count | Across Projects |
|---|---|---|
| fund_transfers | 110+ | All 4 relevant projects |
| material_purchases | 155+ | All 4 relevant projects |

### Transfer Company
- Name: شركه رشاد بحير
- Format: Structured receipts with رقم الحوالة (transfer number) as unique identifier

### Currency
- 100% YER (Yemeni Riyal)
- No multi-currency handling needed

## Business Rules (Non-Negotiable)

1. **NO direct posting** to ERP ledger tables without human approval
2. **Atomic transactions** for posting: use `withTransaction` + `WithClient` methods
3. **Inter-contractor loans** (between زين and المهندس محمد) require mandatory review
4. **Personal account entries** (amounts on عمار's personal account for another project) require mandatory review
5. **Running totals** (اجمالي الحساب لاهنا) are NOT transactions — exclude them
6. **Same amount + same supplier + different dates** = TWO valid separate transactions
7. **Same رقم الحوالة** = always the SAME transaction (primary dedup key)
8. **العباسي date errors (CRITICAL)** — العباسي frequently writes WRONG dates and day names in his expense reports. The inline dates he writes (e.g., "الخميس29/1", "الاثنين2/2", "الخميس 5/2/2024") are UNRELIABLE:
   - Day-of-week may not match the actual date
   - He sometimes writes the wrong year (e.g., 2024 instead of 2026)
   - He sometimes writes wrong month/day combinations
   - **Resolution rule**: Use WhatsApp's message timestamp (the system-generated date at the start of each message) as the AUTHORITATIVE date. The inline dates العباسي writes are secondary evidence only. When there is a conflict between WhatsApp timestamp and العباسي's inline date, flag for human review with reason "date_mismatch_whatsapp_vs_inline". NEVER trust his inline dates without cross-checking against WhatsApp message timestamp.
   - Example: message sent ٤/٢/٢٠٢٦ but العباسي writes "الاثنين2/2" inside — use ٤/٢ as the real date, flag the 2-day discrepancy.
9. **Duplicate expense lines** — العباسي sometimes sends the same expense list twice (copy-paste or resend). The dedup engine must detect identical text blocks sent within a short time window and count them ONCE.

## Two Chat Sources
This pipeline processes TWO separate WhatsApp chat exports:
1. **محادثة زين العابدين** (352 files, 2532 lines) — primary chat with the contractor
2. **محادثة العباسي** (71 files, 1826 lines) — supervisor's expense reporting from الجراحي field
Both chats are between the same Binarjoinanalytic account (عمار) and different counterparties. Transactions may overlap (same حوالة referenced in both chats). Cross-chat dedup is essential.

### Additional People Discovered in العباسي Chat
| Name | Role | Notes |
|---|---|---|
| عبدالله عادل | Field worker with العباسي | Receives daily صرفة (disbursement), meals |
| السيد احمد | Field worker with العباسي | Receives daily صرفة, meals |
| حاتم | Worker | Mentioned in expense lists |
| احمد وهيب | Transport/logistics | Carries الواح (panels), paid per trip |
| صابر / صابر الجبانة | Truck driver (جبانة) | Transports workers and panels |
| عبود | Intermediary | Receives/passes حوالات |
| عبدالله عبدة مشيخي | Worker | Receives عمال الصبة wages |

### Transfer Companies (العباسي chat reveals more)
| Company | Pattern |
|---|---|
| شركه رشاد بحير | Primary (from زين chat) |
| الحوشبي | Used frequently: رقم format 202XXXXXXXXX (12 digits) |
| النجم | Used occasionally: رقم format varies |

## Family Relationship Context
- زين العابدين أخو ابرهيم = contractor for concrete/foundations/materials
- المهندس محمد الفتيني = contractor for platform/panels (BROTHER of زين)
- زين صالح الفتيني = brother of المهندس محمد الفتيني
- Both contractors work in same locations (الجراحي and التحيتا) but on different project phases

## Architecture Notes
- Stack: React 18 + TypeScript + Express + PostgreSQL + Drizzle ORM
- All numeric conversions must use `safeParseNum` from `server/utils/safe-numbers.ts`
- Posting uses `FinancialLedgerService.recordFundTransferWithClient()` (line 480) and `recordMaterialPurchaseWithClient()` (line 493)
- 13 new tables defined in Task #1 schema
- RBAC: admin/editor for upload/view, admin-only for posting

## Future Enhancement Note
In the future, contractor زين's WhatsApp number will be connected to the WhatsApp service for real-time transaction analysis. The current task focuses ONLY on analyzing the already-exported historical chat data.

## Confidence Scoring Rubric
| Pattern | Base Score |
|---|---|
| Structured receipt (Pattern 1) | 0.95 |
| Image+context (Pattern 4) | 0.85 |
| Inline expense (Pattern 2) | 0.80 |
| Multi-line list (Pattern 3) | 0.75 |
| Personal account (Special B) | 0.65 |
| Inter-contractor loan (Special A) | 0.60 |

Penalties: missing_date=-0.10, ambiguous_project=-0.10, amount_below_1000=-0.05, no_supporting_image=-0.05, ambiguous_worker=-0.05
Bonuses: has_transfer_number=+0.05, has_supporting_image=+0.05, explicit_project_mention=+0.05, explicit_amount_with_currency=+0.03
Formula: `final = clamp(base + sum(bonuses) - sum(penalties), 0.0, 1.0)`
