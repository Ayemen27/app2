# Project: Professional AI Agent Workspace

## Overview
This Node.js application serves as a professional AI Agent Workspace, primarily focused on construction project management. It integrates WhatsApp for user interaction, features an advanced AI agent for database operations and queries, generates detailed reports, and implements a granular project permission system. The project aims to enhance decision-making through data analysis, streamline operations, and improve communication efficiency within construction projects by providing a comprehensive, AI-powered platform.

## User Preferences
- **Analytical Thinking:** Step-by-step analysis before answering.
- **Honesty:** Explicitly state when something is unknown.
- **Innovation:** Propose non-traditional solutions if common ones fail.
- **Realism:** Choose the most practical and implementable solution.
- **Transparency:** Clarify assumptions before building on them.
- **No Flattery:** Present reality as it is, even if uncomfortable.
- **No Rushing:** Evaluate options before committing.
- **Decision Rule:** If solution is uncertain -> specify uncertainty percentage.
- **Information Rule:** If info is missing -> request it clearly.
- **Selection Rule:** If multiple solutions -> choose the best and explain why.
- **No Deception:** Do not try to please the user at the expense of truth.
- **Out of the Box:** Short traditional solution -> Smart alternative -> Unconventional (if logical).

## System Architecture

### UI/UX Decisions
The system features a consistent design with a professional navy/blue palette, English numerals, and British DD/MM/YYYY date formats for reports. User preferences for language, dark mode, font size, and notifications are stored. Frontend pages include AI chat, WhatsApp setup, notification management, report generation (Daily, Worker Statement, Period Final, Multi-Project), and permission management.

### Technical Implementations
- **Core Technology:** Node.js with Express.js for the backend and Vite for the client.
- **Database:** PostgreSQL with Drizzle ORM. Financial mutations are wrapped in DB transactions.
- **Route Architecture:** Single-authority routing with organized modules for API routes.
- **Authentication & Security:** JWT-based authentication with access/refresh tokens, WebAuthn/FIDO2 for biometric login, robust rate limiting, token hardening (httpOnly cookies), mass-assignment protection via field allowlists, API response hardening, SQL injection prevention, canonical auth identity, centralized RBAC, and strict CORS origin validation. Session security includes client context extraction, session binding, verification with device binding, refresh token rotation, and replay protection.
- **WhatsApp Reconnect Safety:** Implements dual protection for conflict reconnects and specific exception handling for Baileys errors. Memory safety is ensured with TTL-based eviction for user message counts and rates.
- **Offline System Architecture:** Offline-first PWA design using Service Worker for caching, `sync-leader.ts` for multi-tab leader election, `storage-recovery.ts` for quota management, and IndexedDB for extensive offline data storage, including crash recovery and idempotency.
- **AI Agent:** Processes messages for database CRUD, introspection, and analytics on whitelisted tables, restricting raw SQL execution to SELECT-only. Includes query optimizations. Enhanced well management integration with 7 well-specific ACTION commands: LIST_WELLS (enriched with crew/solar stats), WELL_DETAILS (full details with crews, solar, transport, receptions), WELL_CREWS (crew details per well), WELL_SOLAR (solar component details), WELL_ANALYSIS (comprehensive statistics), WELL_CREWS_SUMMARY (team performance overview), WELL_COMPARISON (cross-project comparison), SEARCH_WELLS (owner name/region search). Arabic intent detection patterns for natural language queries.
- **WhatsApp Integration:** Uses Baileys library for multi-user sessions with security isolation. Features Arabic NLP for normalization, dialect mapping, typo correction, and context-aware smart suggestions.
- **Project Permissions & Data Isolation:** Granular system enforcing user access to projects and data, ensuring non-admin users only see authorized data.
- **Reporting System:** Generates professional daily, worker statement, period-final, and attendance reports, exportable to Excel and PDF with RTL support. Well management report exports: comprehensive multi-sheet Excel (wells overview, crews with team summaries, solar components, transport, financial summary) and print-ready HTML/PDF. 4 report types: comprehensive, wells-only, crews-only, solar-only. Accessible via `/well-reports` page and `/api/wells/reports/export` endpoint.
- **Notifications:** Comprehensive in-app notification system with creation, reading, and deletion capabilities.
- **Data Integrity:** Robust handling for `NaN` values and empty timestamp strings, with financial operations using DB transactions for atomicity.
- **Well Management System:** Expanded schema and services for managing well work crews, solar components, transport details, and receptions, including CRUD endpoints, Zod validation, project access control, and RTL Arabic forms. Auto-allocation of expenses to wells: when transportation, worker misc, or material purchase expenses are saved with well_ids, the system automatically creates well_expenses entries distributing the amount equally across selected wells. Types: transportation→transport, misc→operational_material, materials→consumable_material. Managed by WellExpenseAutoAllocationService with create/update/delete lifecycle.
- **Per-Project Worker Wages (أجور العمال حسب المشروع):** New `worker_project_wages` table enabling different daily wages for the same worker across different projects with effective date ranges. Features: CRUD API endpoints (`/api/worker-project-wages`), automatic wage resolution during attendance recording (falls back to worker's default `dailyWage`), backfill migration endpoint, UI management dialog in workers page, project-specific wage badges in attendance and accounts pages, and per-project wage sections in worker statement PDF/Excel reports. **Automatic recalculation:** A unified `recalculateAttendanceAndBalances()` helper function is called after POST/PATCH/DELETE on worker-project-wages and after PATCH on worker default dailyWage. It uses `resolveEffectiveWageForRoute()` per attendance record to ensure project-specific wages take precedence, then updates worker_balances for all affected projects. **CRITICAL DB NOTE:** The recalculation helper uses `pool.query()` directly (not `db.execute(sql\`...\`)`) because the Drizzle Proxy in `db.ts` does not correctly handle Drizzle's SQL template objects for UPDATE/INSERT/DELETE operations — the query text becomes empty, causing silent no-ops. Always use `pool.query()` with parameterized SQL ($1, $2) for raw UPDATE/INSERT/DELETE statements.
- **Data Import - التحيتا المرحلة الثانية:** 27 wells imported from Excel/PDF for project "ابار التحيتا المهندس محمد" (project_id: b23ad9a5). Includes 38+ crew records (steel/panel installation), 26 solar component records with cable lengths. Source files: المرحلة_الثانية_التحيتا, كشف_حسابات (7 files), كشف_تمتير_الكيبل, كشف_حصر_الحديد.

- **Worker Account Settlement (تصفية حساب العمال):** New feature to settle worker balances across multiple projects. Tables: `worker_settlements` (header) + `worker_settlement_lines` (detail per worker/project). Flow: Preview → Confirm → Execute (atomic transaction). Creates `project_fund_transfers` from source projects to settlement project with description "تصفية حساب العمال: [names]". Only settles positive balances; negative balances shown as compact warning count. API: GET/POST `/api/worker-settlements/preview`, `/api/worker-settlements/execute`, GET `/api/worker-settlements` (supports `page` param), GET `/api/worker-settlements/:id`. Frontend page: `/worker-settlements`. All SQL uses `pool.query()`/`client.query()` inside `withTransaction()`. Access control: All endpoints filter by `accessibleProjectIds` to prevent cross-project data leaks.
- **Replay Protection Scoping:** `financialRouter` replay protection middleware (requireFreshRequest) is scoped to known financial route prefixes only, preventing it from blocking non-financial POST routes (e.g., deployment, settlement) that share the `/api` mount point.
- **Floating Action Button (FAB) System:** Extended to support primary + secondary floating actions. `FloatingButtonContext` now provides `setSecondaryAction(action, label, variant)` alongside the existing `setFloatingAction`. The `FloatingAddButton` renders up to 3 buttons: refresh (top), secondary action (middle), primary action (bottom). Secondary button supports `destructive` (red gradient) and `default` (green gradient) variants. All pages continue to work with existing single-FAB pattern. Equipment page uses dual FAB: primary for "إضافة وارد" and secondary for "صرف مادة".
- **Equipment/Inventory Page Unified Design:** Refactored `equipment-management.tsx` to match unified page patterns: removed duplicate page title (relies on Header component), removed static action buttons (uses FAB system), removed redundant tab sub-headers and duplicate buttons, changed container from custom gradient to `container mx-auto p-4 space-y-4`, updated color tokens to use semantic primary/emerald palette.
- **Storage Purchase Type (نوع "مخزن" في المشتريات):** Full tri-state classification for material purchases: cash (نقد), credit (آجل), storage (مخزن/توريد/مخزني). Storage purchases have paid=0, remaining=0, and do NOT create supplier payable journal entries. Affects: FinancialLedgerService.recordMaterialPurchase (3 branches instead of 2), ExpenseLedgerService (materialExpensesStorage field), supplier-accounts.tsx (blue badge/header for storage, no debt display), financialRoutes supplier statistics (totalStoragePurchases), export-transactions-excel.ts (storage type with blue color), export-material-purchases-excel.ts (purchaseType column).
- **Purchases-Inventory Sync (مزامنة المشتريات مع المخزن):** Complete bidirectional sync between material purchases and inventory. POST creates inventory lot via `InventoryService.receiveFromPurchaseWithClient`. PATCH syncs inventory via `InventoryService.updateFromPurchase` — errors propagate (no swallowing). Update logic preserves consumed quantities: calculates already-issued amount, rejects edits if new qty < consumed, creates new lot with remaining = newQty - consumed. If type changes storage→other, calls `reverseFromPurchase`. DELETE calls `reverseFromPurchase` (errors propagate). Methods: `reverseFromPurchase` (standalone transaction), `reverseFromPurchaseWithClient` (uses provided client), `updateFromPurchase` (atomic: FOR UPDATE lock on lots, reverse remaining, delete old lots, create new lot with consumed-adjusted remaining). All with FK safety (inventory_transactions.lot_id ON DELETE SET NULL).
- **Inventory Item Adjustment Quantity:** PUT `/api/inventory/items/:id` accepts `adjustment_quantity` field. `InventoryService.updateItem()` wrapped in full transaction with FOR UPDATE row locks. Creates ADJUSTMENT_IN/ADJUSTMENT_OUT lot+transaction when quantity changes.
- **Daily Report Fund Transfers First:** In all 4 daily report templates (DailyReportPDF, DailyReportExcel, DailyRangePDF, DailyRangeExcel), the "التحويلات المالية / العهدة الواردة" table is always the FIRST table after KPIs, before attendance/materials/etc.
- **Daily Report Inventory Section:** All 4 daily report templates include "مواد المخزن المصروفة" section showing inventory OUT transactions for the report date. Columns: item name, category, unit, issued qty, total received, remaining qty, notes. Data fetched via CTE-based pool.query in ReportDataService joining inventory_transactions + inventory_items + lot_totals. Type: `InventoryIssuedRecord` in shared/report-types.ts, field `inventoryIssued?` on `DailyReportData`.

- **SummaryRebuildService Critical Fix (March 2026):** Fixed 3 critical bugs in `server/services/SummaryRebuildService.ts`:
  1. **Wrong column name:** All 8 SQL references used `invalid_from_date` but actual DB column is `invalidated_from`. Fixed all queries (INSERT/SELECT/DELETE) to use correct column name.
  2. **Wrong UPSERT logic:** Used `ON CONFLICT (project_id)` but `project_id` is NOT unique (PK is `id` uuid, 625+ rows multi-row per project). Fixed `markInvalid` to simple INSERT (append-only), `ensureValidSummary` to use `SELECT MIN(invalidated_from)`, and cleanup DELETE to remove all invalidation rows for project up to targetDate.
  3. **SQL alias in WHERE bug:** `getActiveDatesWithClient` used `AND sub_date >= $3` inside UNION subqueries, but `sub_date` is a SELECT alias — PostgreSQL doesn't allow alias references in WHERE clauses. Fixed by moving the filter to the outer query's WHERE clause.
  4. **Removed dead code:** Deleted `ensureInvalidationsTable()` and `ensureTable()` functions — the table already exists in production with different structure (reason, source_table, source_id columns).
  5. **Added performance indexes:** `idx_summary_invalidations_project` on `project_id`, `idx_summary_invalidations_date` on `invalidated_from`.
- **Worker Attendance paidAmount CAST Fix (March 2026):** Fixed `CAST( AS DECIMAL(15,2))` SQL syntax error in `workerRoutes.ts` duplicate-check query (line ~2380). Root cause: `validationResult.data.paidAmount` was `undefined` when not provided in request body, causing Drizzle to generate empty CAST. Fix: (1) Added `paidAmount` sanitization — coalesces `undefined`/`null`/empty string to `0` with `isNaN` guard before any SQL usage, (2) Added `COALESCE(..., '0')` around DB column references in duplicate-check query, (3) Explicitly set `paidAmount`, `remainingAmount`, and `paymentType` in `dataWithCalculatedFields` instead of relying on spread, (4) Applied same sanitization to PUT/PATCH update handler, (5) Set `DEFAULT '0'` on `paid_amount`, `remaining_amount`, `work_days` columns in DB, (6) Cleaned existing NULL values in production data.
- **Financial Architecture Audit & Fixes (SSOT Enforcement):** Comprehensive audit identified and fixed 4 critical bugs:
  1. **FinancialLedgerService.invalidateSummaries** was using Drizzle `db.insert(summaryInvalidations)` with different column schema — now delegates to `SummaryRebuildService.markInvalid()` (the canonical invalidation path).
  2. **FinancialLedgerService.runReconciliation** CTE was missing `supplier_payments` in expenses — now includes it.
  3. **projectRoutes all-projects summaries** (2 paths: date-based and per-project) were missing `supplier_payments` in `overallTotalExpenses` — now both paths query and include them. Per-project path also now filters materials to cash-only with paid_amount logic.
  4. **storage.ts supplier payment CRUD** (create/update/delete) was not invalidating daily summaries — now calls `SummaryRebuildService.markInvalid()` + `updateDailySummaryForDate()` on affected dates.
  5. **ReportDataService** daily and period reports now use cash-only materials (نقد/نقداً) with `paid_amount > 0 ? paid_amount : total_amount` logic and include `supplier_payments`.
- **Sync Audit & Idempotency System:** Comprehensive sync management with: (1) Atomic idempotency middleware using SHA256 composite key (user_id+method+endpoint+key) with INSERT ON CONFLICT claim-before-execute pattern preventing duplicate concurrent requests, scheduled cleanup every hour. (2) SyncAuditService with per-operation logging (logOperation), bulk sync logging (logBulkSync), paginated logs with date-range/module/status/action filters (getLogs), stats aggregation with conflict/skipped counts (getStats), purge old logs (purgeLogs). (3) retryWithBackoff utility with exponential backoff + jitter for transient errors (ECONNRESET, deadlock, timeout) up to 3 retries. (4) SyncManagementPage: ALL tabs (server-audit, history, pending, failed, duplicates) read from database sync_audit_logs table - no client-side storage dependency. Each tab auto-filters by status (success/conflict/failed/duplicate). Unified AuditLogCard component, Excel/PDF export on all tabs. Tables: sync_audit_logs (8 indexes including 3 composite), idempotency_keys. Routes: /api/sync-audit/* (admin-only).

### Feature Specifications
- **Biometric Login:** WebAuthn/FIDO2 for secure authentication.
- **User Preferences:** Database-persisted settings for customizable application behavior.
- **Admin AI Chat:** Exclusive access for administrators to an AI agent for advanced database interactions.
- **WhatsApp Multi-User Support:** Allows multiple users to manage WhatsApp interactions independently.
- **Comprehensive Project Access Control:** Ensures users interact only with authorized project data.
- **Professional Reports:** Generation of detailed financial and operational reports in Excel and PDF.
- **Real-time Notifications:** In-app notification system with varying priorities.

### Phase 4 Sync Security & Performance Improvements (Completed)
- **Batch Sync Column Security (P0):** Added `ALLOWED_COLUMNS_BY_TABLE` with separate `insert` and `update` allowlists for all 14 batch-synced tables. `sanitizeColumns()` now filters columns against per-table whitelists. Server-managed columns (`created_at`, `updated_at`, `created_by`, sync flags) are automatically stripped from client payloads. Prevents mass-assignment attacks on financial fields, ownership columns, and sync control fields.
- **Batch Sync Zod Validation:** Added `batchRequestSchema` and `batchOperationSchema` Zod schemas. Request body is validated before processing. Invalid payloads return 400 with structured error details.
- **Paginated Sync (P1):** New `POST /api/sync/paginated` endpoint with cursor-based keyset pagination. Replaces monolithic 50,000-row LIMIT with configurable pageSize (100-10,000, default 5,000). Supports `cursor`, `lastSyncTime`, and `pageSize` params. Returns `nextCursor` and `hasMore` for incremental fetching. New `GET /api/sync/tables` endpoint lists all syncable tables with their date column capabilities. Backward-compatible: existing full-backup endpoints continue to work unchanged.
- **Validation Middleware:** Created reusable `validateRequest()` middleware in `server/middleware/validateRequest.ts`. Supports body, query, and params schema validation. Returns structured error responses with location and path info.
- **Table name fix:** `autocomplete` batch table mapping corrected to `autocomplete_data` matching actual DB table name.
- **wells.created_by fix:** Removed `created_by` from server-managed column blacklist and added it to insert allowlists for wells, workers, and suppliers tables (required notNull field).
- **Non-admin delete/update fix:** Batch sync now derives `project_id` from existing DB record for PATCH/PUT/DELETE operations when payload lacks it, enabling offline delete queues that send `{id}` only.
- **Empty columns guard:** Insert operations now reject with clear error if all payload columns are filtered out after sanitization, preventing invalid SQL generation.

### Phase 5 Backup System Hardening (Completed)
- **Modular Architecture:** Extracted backup logic into `server/services/backup/` with 3 modules: `ddl-generator.ts`, `integrity-checker.ts`, `restore-engine.ts`.
- **Full DDL Generation:** `getFullTableDDL()` now captures PRIMARY KEY, FOREIGN KEY (with ON UPDATE/DELETE), UNIQUE, CHECK constraints, and custom INDEXES (not just columns+PK).
- **Sequences DDL:** `getSequencesDDL()` dumps all sequences with current values for complete restoration.
- **SHA-256 Checksum:** Backup files now include `meta.checksum` computed from data payload. Restore verifies checksum before proceeding.
- **Backup Structure Validation:** `validateBackupStructure()` checks meta/schemas/data keys, version, tablesCount consistency.
- **Decompression Size Limit:** `validateDecompressedSize()` prevents gzip bomb attacks (default 500MB limit).
- **Atomic Restore:** `restoreData()` uses `session_replication_role = 'replica'` to disable triggers, TRUNCATE without CASCADE, fail-fast on critical errors, accurate `rowCount` tracking.
- **All Sequences Fixed:** `fixAllSequences()` finds ALL serial/identity columns (not just `id`), resets each sequence to max value.
- **Sensitive Data Protection:** `redactSensitiveData()` replaces passwords/tokens with `[REDACTED]` for external copies (Telegram/Drive).
- **Silent Partial Backup Prevention:** Failed table reads are logged as errors and tracked in `meta.skippedTables`. Backup fails if ALL tables fail.
- **analyzeDatabase Fix:** Now respects `target` parameter (was hardcoded to local).
- **Backup Version:** Bumped from 3.0 to 4.0 with new `checksum`, `skippedTables`, and `sequences` fields.
- **Redaction Applied for External Copies:** `postBackupActions` now creates a temporary redacted `.gz` file with passwords/tokens replaced by `[REDACTED]` before uploading to Telegram/Drive. Temp file is cleaned up after upload.
- **TRUNCATE Order Fix:** `session_replication_role = 'replica'` is set BEFORE TRUNCATE (not after), and TRUNCATE uses CASCADE to handle FK dependencies safely.
- **Row Count Verification:** Restore engine now logs warnings when actual inserted rows differ from expected, and includes the discrepancy in the report.
- **analyzeDatabase Central Fix:** Now uses `DATABASE_URL_CENTRAL` environment variable for 'central' target instead of falling back to local pool.
- **restoreBackup Central Fix:** `restoreBackup(target='central')` now creates a separate Pool from `DATABASE_URL_CENTRAL` instead of incorrectly using local pool.
- **Redacted Backup Integrity:** External redacted copies now include correct schemas, sequences, and a recalculated checksum matching the redacted data.

### Phase 5b Streaming Backup v5.0 (Completed)
- **Streaming Exporter (`server/services/backup/streaming-exporter.ts`):** Cursor-based PostgreSQL export (FETCH 500 batches) producing directory structure: `manifest.json` + `schema.sql` + `sequences.sql` + `tables/<table>.ndjson.gz`. SHA-256 checksum per table on raw NDJSON. Stream backpressure handling (await drain). No full-memory load.
- **Streaming Restorer (`server/services/backup/streaming-restorer.ts`):** Line-by-line `readline` streaming from gzipped NDJSON. Batch INSERT (100 rows) with parameterized `ON CONFLICT DO NOTHING`. Checksum verification on decompressed content (matching exporter). Partial restore by table name. Fully atomic transaction: schema DDL + `session_replication_role='replica'` + TRUNCATE CASCADE + INSERT + sequences + COMMIT (ROLLBACK on error).
- **BackupService Integration:** `runBackup(triggeredBy, format)` accepts `'json'|'streaming'`. `restoreBackup` auto-detects streaming directories via `manifest.json`. `listBackups` returns both `.json.gz` files and `backup-*` directories with `format` field. `deleteBackup` and `enforceRetentionPolicy` handle both files and directories. Route passes `format` from request body.

### Phase 6 Financial Integrity & Write-Path Hardening (Completed)
- **Financial Atomicity (Critical Fix):** `createJournalEntry()` now wraps header+lines inserts in `withTransaction`. New private `_createJournalEntryWithClient(client, params)` uses `client.query()` with parameterized SQL. `reverseEntry()` now calls `_createJournalEntryWithClient` inside its existing transaction (no nested independent transaction). `recordProjectTransfer()` wraps both outbound+inbound entries in a single `withTransaction` for full atomicity.
- **Ledger Posting Await (High Fix):** All 18 `FinancialLedgerService.safeRecord()` calls in `financialRoutes.ts` are now `await`ed. Eliminates fire-and-forget behavior that could cause silent accounting drift.

### Double-Entry Accounting Integrity Overhaul (March 2026)
- **Root Cause: `safeRecord` Error Swallowing Eliminated.** The `safeRecord()` method in `FinancialLedgerService.ts` was catching and silently discarding all journal entry creation errors. This caused **868 orphan financial records (23.3M SAR)** across 4 tables without corresponding journal entries. `safeRecord` has been **completely deleted** from the codebase. All journal entry calls are now direct `await` with errors propagating to callers.
- **`recordMaterialPurchase(مخزن)` Fixed.** Previously created a single-line journal entry (DEBIT only, no CREDIT) which violated double-entry balance rules. Now creates balanced entry: DR 5000 MATERIAL_EXPENSE / CR 1200 INVENTORY_ASSET. New account code `INVENTORY_ASSET: '1200'` added to ACCOUNT_CODES.
- **Settlement Accounting Added.** `settlementRoutes.ts` previously created `project_fund_transfers` and `worker_transfers` without any journal entries. Now calls `FinancialLedgerService._createJournalEntryWithClient()` within the existing settlement transaction to create proper double-entry records for both transfer types.
- **`_createJournalEntryWithClient` Made Public.** Changed from `private static` to `static` so routes can use it with their own transaction clients for atomic operations.
- **`reverseEntryWithClient` Added.** New method that accepts a `pg.PoolClient` for reversing journal entries within an existing transaction (used by PATCH/DELETE routes).
- **`recordSupplierPayment` Added.** New method for supplier_payments table: DR 2000 SUPPLIER_PAYABLE / CR 1100 CASH.
- **Atomic Financial Transactions (workerRoutes.ts).** All 6 `safeRecord` calls replaced with proper `await` and `withTransaction` wrapping: PATCH/DELETE worker-transfers, PATCH worker-misc-expenses, DELETE/POST/PATCH worker-attendance.
- **Atomic Financial Transactions (financialRoutes.ts).** All 18 `safeRecord` calls replaced with direct `await` calls. Journal entries now fail-fast — if a journal entry fails, the HTTP response returns an error.
- **DB Safety Constraints Applied at Startup.** New `server/migrations/add-journal-constraints.ts` with `applyJournalConstraints()` called from `server/index.ts`:
  - CHECK `chk_journal_lines_non_negative`: `debit_amount >= 0 AND credit_amount >= 0`
  - CHECK `chk_journal_lines_single_side`: prevents both debit AND credit > 0 on same line
  - Partial UNIQUE INDEX `idx_journal_source_unique`: `(source_table, source_id, project_id) WHERE status='posted' AND entry_type='original'` — prevents duplicate journal entries for same source record
- **Backfill Script Created.** `server/scripts/backfill-orphan-journal-entries.ts` processes orphan records across 6 tables (fund_transfers, transportation_expenses, worker_transfers, worker_misc_expenses, material_purchases, worker_attendance). Supports `DRY_RUN=true` mode. Idempotent — checks for existing journal entries before creating. Batch processing (50 at a time) with progress logging.
- **Accounting Integrity Audit Reports.** Full audit reports saved at `.local/accounting-integrity-audit.md` and `.local/financial-audit-report.md`.
- **db.execute→pool.query Migration (High Fix):** `idempotency.ts` and `NotificationQueueWorker.ts` converted all INSERT/UPDATE/DELETE mutations from `db.execute(sql\`...\`)` to `pool.query()` with parameterized SQL. Read operations kept as-is.

### Phase 3 DB-Schema Alignment (Completed)
- **Schema.ts aligned to production DB** (DB is source of truth, no DB migrations run)
- **Type fixes:** audit_logs.user_id (varchar→integer), users.is_active (text→boolean), fund_transfers.transferDate (text→timestamp), metrics.metricValue column name, monitoring_data/system_logs/backup_settings restructured, well_work_crews counts (integer→decimal), refresh_tokens.parentId added
- **Sync columns:** Added is_local/synced/pending_sync to 35+ tables matching DB
- **Missing columns:** Added updated_at, description, metadata columns to 12+ tables
- **Code fixes:** brain.ts metrics references, auth.ts/authRoutes.ts boolean handling, storage.ts audit_logs integer handling
- **FK migration scripts:** Prepared in migrations/T005-phase-{A,B,C,D}*.sql (NOT executed — requires manual review, orphan detection first)
- **Reports:** T001 drift report, T006 limit review in reports/

### Central Log Bank (بنك السجلات المركزي) — Completed
- **Architecture:** PostgreSQL-based centralized log system (no external dependencies like ELK/Graylog).
- **Table:** `central_event_logs` with 7 optimized indexes (BRIN on event_time, B-Tree composites on level/module/source/project/actor, GIN on details JSONB).
- **Service:** `CentralLogService` (singleton, `server/services/CentralLogService.ts`):
  - In-memory queue with batch INSERT (200 records or every 2 seconds).
  - `log()` (non-blocking), `logError()`, `logHttp()` (5xx always, 4xx 20% sample, slow >1500ms), `logDomain()`.
  - `redactSensitive()` strips password/token/secret/authorization/cookie/apiKey/jwt recursively.
  - Fail-safe: insert errors go to console.error, never throw.
  - `purge()` with retention policy: debug 3d, info 14d, warn 60d, error/critical 180d. Auto-runs daily at 3:00 AM.
- **Dual-Write Sources (8 total):**
  1. SyncAuditService → source: 'sync' (logOperation + logBulkSync)
  2. requestLoggingMiddleware → source: 'api' (5xx/4xx/slow requests)
  3. WhatsAppBot.logSecurityEvent → source: 'whatsapp'
  4. Auth middleware → source: 'auth' (login/logout/auth_failed)
  5. FinancialLedgerService → source: 'finance' (journal entries, reversals)
  6. ProjectAccessService → source: 'auth', module: 'صلاحيات' (permission changes)
  7. WellService → source: 'wells' (create/update/delete wells/tasks)
  8. Pino Logger (warn/error) → source: 'system'
- **Monitoring Job:** Every 5 minutes collects CPU/RAM/DB metrics → monitoring_data + central_event_logs.
- **API Routes:** `/api/central-logs` (list with filters), `/api/central-logs/stats`, `/api/central-logs/export` (CSV/JSON), `/api/central-logs/purge`.
- **Frontend:** `/admin/central-logs` page with stats cards, filters (level/source/module/status/project/search/date), expandable JSON details, pagination, CSV/JSON export, auto-refresh 30s. Arabic RTL.
- **Critical DB Note:** CentralLogService uses `pool.query()` with parameterized SQL for writes (not Drizzle ORM).

### Daily Expense Summaries - Lazy Recalculation (Completed)
- **Problem:** Editing old financial records didn't propagate carriedForward/remainingBalance changes to subsequent days' summaries.
- **Architecture:** Invalidation Cascade + Lazy Recalculation pattern via `SummaryRebuildService` (`server/services/SummaryRebuildService.ts`).
- **markInvalid(projectId, fromDate):** Called after every financial write (create/update/delete). Upserts into `summary_invalidations` table using LEAST() to keep the earliest invalidation date per project. Input validation ensures valid YYYY-MM-DD format.
- **ensureValidSummary(projectId, targetDate):** Called before every summary read. If invalidation exists covering requested date: acquires `pg_advisory_xact_lock`, deletes stale summaries from invalidation date forward, rebuilds day-by-day using parameterized SQL on the same client connection (transaction-safe), deletes invalidation only if its value hasn't changed (prevents lost invalidation race condition).
- **rebuildProjectSummaries(projectId):** Full rebuild from scratch (manual trigger). Also uses advisory lock and single-client transaction.
- **Integration Points:**
  - **Writes (~30 points):** All financial CRUD in financialRoutes.ts, workerRoutes.ts, recordTransferRoutes.ts, settlementRoutes.ts call `markInvalid`. Settlement routes additionally invalidate all affected worker project IDs.
  - **Reads (2 points):** `GET /daily-expenses/:date` and `GET /daily-summary/:date` in projectRoutes.ts call `ensureValidSummary` before returning data. CarriedForward uses rebuilt summary with `calculateCumulativeBalance` fallback.
- **Old Paths Removed:** `storage.updateDailySummaryForDate` calls removed from all route files. `FinancialLedgerService.invalidateSummaries` still logs to `summary_invalidations` table (compatible).
- **Critical DB Note:** All rebuild operations use `client.query()` within a single transaction (not `pool.query()`), ensuring atomicity under advisory lock.

## External Dependencies
- **Monitoring:** OpenTelemetry and Sentry.
- **WhatsApp:** Baileys library.
- **Biometrics:** `@simplewebauthn/server` package.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **AI Models:** HuggingFace (Llama 3.1 8B), Gemini 2.0 Flash, OpenAI GPT-4o.
- **Reporting:** ExcelJS for Excel generation.
- **Deployment:** PM2 for process management.
- **QR Code Generation:** `qrcode` package.
- **XSS Protection:** DOMPurify for sanitizing HTML in PDF generation.