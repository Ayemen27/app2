# WhatsApp Import Pipeline — Continuity & Recovery Guide

## Purpose
This file ensures ANY agent (current or future) can resume work on this pipeline from any point. It contains all business context, database state, naming mappings, and task dependencies needed to continue without re-discovery.

## Pipeline Overview
Import exported WhatsApp conversations (Arabic, Yemeni dialect) and convert them into structured financial entries in the existing Axion ERP system. NO direct posting to ledger without human approval.

## Task Chain (Sequential Dependencies)
```
Task #1: Schema & Ingestion → Task #2: Extraction Engine → Task #3: Dedup & Matching → Task #4: Review Dashboard & Posting
```
Each task MUST be completed and verified before the next can begin. A task is "complete" when all its acceptance criteria pass and the app starts without errors.

## How to Resume If Agent Stops Mid-Task

### Step 1: Identify Current State
Run these checks:
```sql
-- Check if wa_import tables exist
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'wa_%' ORDER BY table_name;
```
```bash
# Check if services exist
ls -la server/services/whatsapp-import/
# Check if routes exist
grep -r "wa-import" server/routes/
# Check if frontend page exists
ls -la client/src/pages/wa-import/
```

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

### Step 3: Read the Relevant Task Plan
Plans are in this directory:
- `wa-import-plans/01-schema-ingestion.md`
- `wa-import-plans/02-extraction-engine.md`
- `wa-import-plans/03-dedup-matching.md`
- `wa-import-plans/04-review-posting.md`

### Step 4: Check What's Already Built
```bash
# List all WhatsApp import related files
find server/services/whatsapp-import/ -type f 2>/dev/null
find client/src/pages/wa-import/ -type f 2>/dev/null
grep "wa_" shared/schema.ts | head -20
```

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
