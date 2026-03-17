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

### Phase 3 DB-Schema Alignment (Completed)
- **Schema.ts aligned to production DB** (DB is source of truth, no DB migrations run)
- **Type fixes:** audit_logs.user_id (varchar→integer), users.is_active (text→boolean), fund_transfers.transferDate (text→timestamp), metrics.metricValue column name, monitoring_data/system_logs/backup_settings restructured, well_work_crews counts (integer→decimal), refresh_tokens.parentId added
- **Sync columns:** Added is_local/synced/pending_sync to 35+ tables matching DB
- **Missing columns:** Added updated_at, description, metadata columns to 12+ tables
- **Code fixes:** brain.ts metrics references, auth.ts/authRoutes.ts boolean handling, storage.ts audit_logs integer handling
- **FK migration scripts:** Prepared in migrations/T005-phase-{A,B,C,D}*.sql (NOT executed — requires manual review, orphan detection first)
- **Reports:** T001 drift report, T006 limit review in reports/

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