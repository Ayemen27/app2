# Project: Professional AI Agent Workspace

## Overview
This Node.js application functions as a professional AI Agent Workspace, primarily for construction project management. It integrates WhatsApp for user interaction, utilizes an advanced AI agent for database operations and queries, generates detailed reports, and implements a granular project permission system. The project aims to enhance decision-making through data analysis, streamline operations, and improve communication efficiency within construction projects by providing a comprehensive, AI-powered platform. It focuses on business vision, market potential, and project ambitions to deliver a state-of-the-art solution for construction project management.

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
The system maintains a consistent design using a professional navy/blue palette, English numerals, and British DD/MM/YYYY date formats for reports. User preferences for language, dark mode, font size, and notifications are persistently stored. Frontend pages are designed for AI chat, WhatsApp setup, notification management, various report generations (Daily, Worker Statement, Period Final, Multi-Project), and comprehensive permission management.

### Technical Implementations
- **Core Technologies:** Node.js with Express.js for the backend and Vite for the client-side.
- **Database & ORM:** PostgreSQL with Drizzle ORM, ensuring financial mutations are wrapped in atomic database transactions.
- **Authentication & Security:** JWT-based authentication with access/refresh tokens, WebAuthn/FIDO2 for biometric login, robust rate limiting, token hardening (httpOnly cookies), mass-assignment protection via field allowlists, API response hardening, SQL injection prevention, canonical auth identity, centralized RBAC, and strict CORS origin validation. Session security includes stable multi-device sessions (sessionToken stays fixed during refresh), per-device independent sessions, Compare-and-Swap atomic refresh with 30-second grace window for concurrent requests, Capacitor-aware platform binding (android↔web compatible when OS matches), device hash + device ID verification, and per-session revocation (not revokeAll on mismatch). Admin-only enforcement is applied to sensitive operations.
- **AI Agent:** Processes messages for database CRUD, introspection, and analytics on whitelisted tables, restricting raw SQL execution to SELECT-only. It includes query optimizations and enhanced well management integration with specific ACTION commands. Arabic intent detection patterns are supported for natural language queries.
- **WhatsApp Integration:** Uses the Baileys library for multi-user sessions with security isolation, featuring Arabic NLP for normalization, dialect mapping, typo correction, and context-aware smart suggestions.
- **Project Permissions & Data Isolation:** A granular system enforces user access to projects and data, ensuring non-admin users only view authorized information.
- **Reporting System:** Generates professional daily, worker statement, period-final, multi-project-final, and **project-comprehensive** reports, exportable to Excel and PDF with RTL support. The Project Comprehensive Report aggregates workforce (total/active workers, by type, top earners), wells (status, depth, completion, crew wages), attendance (daily summary), expenses (materials by category, transport, misc, worker transfers), cash custody (fund transfers, project transfers, net balance), and equipment — all with KPIs (cost/well, cost/worker/day, budget utilization). Well management reports include comprehensive multi-sheet Excel and print-ready HTML/PDF.
- **Notifications:** A comprehensive in-app notification system allows for creation, reading, and deletion. Local notifications via `@capacitor/local-notifications` are used for update alerts in the Android status bar (channel: `app-updates`, importance: HIGH). Push notifications registered via `@capacitor/push-notifications`.
- **Status Bar Management:** `statusBarManager.ts` detects dark/light mode and sets status bar color to match the app header (white/dark) with correct icon style (Light=dark icons for light bg, Dark=light icons for dark bg). Uses `@capacitor/status-bar`.
- **Data Integrity:** Robust handling for `NaN` values and empty timestamp strings, with financial operations utilizing database transactions for atomicity.
- **Well Management System:** Expanded schema and services manage well work crews, solar components, transport details, and receptions, including CRUD endpoints, Zod validation, project access control, and RTL Arabic forms. Expenses are auto-allocated to wells based on type.
- **Per-Project Worker Wages:** A `worker_project_wages` table enables different daily wages for workers across projects with effective date ranges, including CRUD API endpoints, automatic wage resolution, and a unified recalculation helper.
- **Worker Account Settlement:** A new feature for settling worker balances across multiple projects, involving `worker_settlements` and `worker_settlement_lines` tables, with an atomic preview-confirm-execute flow.
- **Floating Action Button (FAB) System:** Extended to support primary and secondary floating actions, allowing for more dynamic UI interactions across pages.
- **Equipment/Inventory Page Unified Design:** Refactored for consistency, utilizing the FAB system and updated color tokens.
- **Storage Purchase Type:** Implemented a tri-state classification for material purchases (cash, credit, storage), affecting financial ledger entries and reporting.
- **Purchases-Inventory Sync:** Bidirectional synchronization between material purchases and inventory, ensuring data consistency and preserving consumed quantities.
- **Inventory Item Adjustment:** Allows for `adjustment_quantity` on inventory items with transaction-wrapped updates and row locks.
- **Daily Report Enhancements:** Fund transfers are prioritized, and an inventory section showing issued materials is included in all daily report templates.
- **Offline System Architecture:** Offline-first PWA design using Service Worker for caching, `sync-leader.ts` for multi-tab leader election, `storage-recovery.ts` for quota management, and IndexedDB for extensive offline data storage, including crash recovery and idempotency.
- **Sync Audit & Idempotency System:** Comprehensive sync management with atomic idempotency middleware, `SyncAuditService` for per-operation logging, and `retryWithBackoff` utility for transient errors.
- **Central Log Bank:** A PostgreSQL-based centralized log system (`central_event_logs`) with an in-memory queue for batch inserts, sensitive data redaction, retention policies, and dual-write sources from various system components.
- **Daily Expense Summaries - Lazy Recalculation:** Implements an invalidation cascade and lazy recalculation pattern via `SummaryRebuildService` to ensure accurate daily expense summaries after financial record edits.
- **Double-Entry Accounting Integrity:** Critical fixes implemented to ensure all financial transactions adhere to double-entry accounting principles, eliminating error swallowing, adding settlement accounting, and applying database safety constraints. A backfill script was created for orphan journal entries.
- **Financial Integrity System (March 2026):** Comprehensive overhaul to match global accounting standards:
  - **Unified Source of Truth:** All wage calculations throughout the system (settlements, reports, balances, AI agent) now use `actual_wage` instead of `daily_wage * work_days`. This eliminates the critical discrepancy bug that caused incorrect settlement amounts.
  - **FinancialIntegrityService** (`server/services/FinancialIntegrityService.ts`): Central service providing `syncWorkerBalance()` (auto-recalculation after every financial operation), `logFinancialChange()` (audit trail), `runReconciliation()` (health check), `rebuildAllBalances()`, and `getBalanceWarnings()` (negative balance alerts).
  - **Auto-sync Worker Balances:** Every attendance POST/PATCH/DELETE and transfer POST/PATCH/DELETE triggers automatic balance recalculation from source data. Balance sync is awaited (not fire-and-forget) to guarantee consistency before response.
  - **Financial Audit Trail:** Every financial mutation (create/update/delete on attendance and transfers) is logged to `financial_audit_log` with before/after data, user identity, and reason. Covers both workerRoutes and financialRoutes.
  - **Reconciliation API:** `GET /api/financial-integrity/reconciliation` runs full data integrity check including missing balance rows detection. `POST /api/financial-integrity/rebuild-balances` rebuilds all balances. `GET /api/financial-integrity/audit-log` retrieves audit history.
  - **Negative Balance Warnings:** API responses include warnings when a worker's balance goes negative.
  - **Financial Guard (Overpayment Protection):** When `paidAmount > actualWage` or `workDays=0 with paidAmount>0`, the API returns 422 with `requiresConfirmation: true` and a `suggestedAction`. The frontend shows an interactive split dialog where the user specifies how much is wages vs advance, with notes. On confirmation (`confirmOverpayment: true` + `wageAmount` + `advanceAmount` + `advanceNotes`), the system saves attendance with the wage portion and auto-creates a `worker_transfer` for the advance. Applies to both POST and PATCH. Files: `server/routes/modules/workerRoutes.ts`, `client/src/components/overpayment-split-dialog.tsx`, `client/src/pages/worker-attendance.tsx`.
  - **Material Purchase Guard:** Backend protection on POST + PATCH for `/api/material-purchases` (financialRoutes) and `POST /api/projects/:id/material-purchases` (projectRoutes) — checks for duplicate purchases, budget overrun, and unusually large amounts. Returns 422 with suggestions dialog. Frontend handling in `daily-expenses.tsx` and `material-purchase.tsx` with `FinancialGuardDialog`. Supports `confirmGuard=true` + `guardNote` (≥5 chars mandatory) + `adjustedAmount` (validated: finite, ≥0) to proceed after confirmation. All overrides tagged with `[GUARD_OVERRIDE]` in notes + server console log.
  - **recalculateAttendanceAndBalances Helper:** Uses `actual_wage` for balance recomputation (fixed from `daily_wage * work_days`).
  - **Worker Statement Excel:** Uses per-record `actualWage` from attendance (fixed from current worker dailyWage * workDays).
  - **Data Repair (March 2026):** 79 worker balances rebuilt from source of truth (0 mismatches), 28 inconsistent attendance records documented in audit log.
  - **DB Triggers for Summary Invalidation (March 2026):** PostgreSQL trigger function `trg_financial_invalidate()` with AFTER INSERT/UPDATE/DELETE on all 8 financial tables (fund_transfers, project_fund_transfers, worker_attendance, material_purchases, transportation_expenses, worker_transfers, worker_misc_expenses, supplier_payments). `project_fund_transfers` invalidates both `from_project_id` and `to_project_id`. `worker_attendance` uses `COALESCE(NULLIF(date,''), attendance_date)`. `ensureTriggersExist()` always runs `CREATE OR REPLACE FUNCTION` at startup.
  - **Date Consistency Fix (March 2026):** All worker_attendance date queries unified to use `COALESCE(NULLIF(date,''), attendance_date)` across projectRoutes.ts, workerRoutes.ts, ExpenseLedgerService.ts, and SummaryRebuildService.ts.
  - **Sync Batch Enhancement (March 2026):** `project_fund_transfers` added to `FINANCIAL_TABLES_SET` and `DATE_FIELD_DB_MAP` with special dual-project invalidation for INSERT/PATCH/DELETE.
  - **Comprehensive Audit (March 2026):** 22/22 checks passed after fixes: 221 financial summaries verified, 80 worker balances recalculated, 8 DB triggers confirmed, 5 route files security-reviewed (no SQL injection, no IDOR, no auth gaps).
  - **Deep Audit & Schema Hardening (March 2026):** 4-batch deep audit covering orphans, duplicates, staleness, financial edge cases, system health, and business logic. Results: 0 true duplicate purchases/transfers (all legitimate), 106 pre-guard legacy overpayments flagged, 30 negative balances flagged, 16 orphaned notification_read_states cleaned, 14 stale workers flagged. All 6 projects reconcile perfectly. All 1,608 journal entries balanced.
  - **Foreign Key Constraints (March 2026):** Added 15 DB-level FK constraints to 8 tables: worker_attendance (worker_id→workers CASCADE, project_id→projects CASCADE), worker_transfers (worker_id→workers CASCADE, project_id→projects CASCADE), project_fund_transfers (from/to→projects RESTRICT — prevents deleting projects with inter-project transfers), transportation_expenses (project_id→projects CASCADE, worker_id→workers SET NULL), worker_misc_expenses (project_id→projects CASCADE), supplier_payments (supplier_id→suppliers CASCADE, project_id→projects CASCADE, purchase_id→material_purchases SET NULL), worker_balances (worker_id→workers CASCADE, project_id→projects CASCADE), notification_read_states (user_id→users CASCADE). Added 4 new supporting indexes.
  - **Report Data Accuracy Fix (March 2026):** 5 critical bugs fixed in `ReportDataService.ts`:
    1. Daily Report: `totalWage` now uses `actual_wage` (fallback to `dailyWage * workDays` only if null)
    2. Worker Statement: earned amount uses `actual_wage`, effective date uses `date || attendanceDate`
    3. Worker Statement project summary: uses `actual_wage` consistently
    4. Comprehensive Report: all attendance date queries use `COALESCE(NULLIF(wa.date,''), wa.attendance_date)` 
    5. Comprehensive Report: fund transfer dates use safe date expression (same as daily/period reports)
  - **Supplier Payments in Reports (March 2026):** `supplier_payments` table now included in Period Final and Comprehensive reports. Added `SupplierPaymentRecord` interface to `shared/report-types.ts`. Period Final shows supplier payment items with supplier name, amount, method, reference. Comprehensive shows supplier payment totals in expenses section. Excel/PDF templates for both Period Final and Comprehensive reports now render supplier payments sections with detailed item rows and summary totals.
  - **Extended Date Consistency Fix (March 2026):** COALESCE(NULLIF(date,''), attendance_date) pattern extended to ALL report paths: getDailyReport, getPeriodFinalReport (filter + group), reportRoutes.ts legacy endpoints (daily, periodic, worker-statement), AI ReportGenerator.generateAttendanceReport, DatabaseActions.getDailyExpenses and getMonthlyTrends, FinancialLedgerService computed balance, financialRoutes.ts worker-statement-excel, and projectRoutes.ts project stats. All actual_wage fixes extended to reportRoutes.ts v1 daily handler and AI ReportGenerator earned calculation.
- **WhatsApp Chat Export → Accounting Pipeline (March 2026):** Multi-phase pipeline converting WhatsApp conversations into structured financial entries with mandatory human approval.
  - **13 wa_* tables** in schema.ts for import batches, raw messages, media assets, canonical transactions, extraction candidates, evidence links, worker aliases, custodian entries, project hypotheses, dedup keys, verification queue, posting results, review actions.
  - **Task #1 (Schema & Ingestion):** ZIP upload with bomb protection (2000 entries, 2GB limit), raw message parsing, batch management. Routes at `/api/wa-import/`.
  - **Task #2 (Financial Extraction):** 8 service files: ArabicAmountParser (Eastern Arabic digits), TransferReceiptParsers (3 companies), ExpenseExtractors, MessageFilters, ContextClusteringEngine, ProjectInferenceEngine (4-project matrix), SpecialTransactionDetectors, ScoringAndCategorization. Orchestrated by WhatsAppExtractionService.
  - **Task #3 (Dedup, Matching & Reconciliation):** 7 service files: FingerprintEngine (SHA-256, transfer_number primary key), CrossChatDedupEngine (cross-chat by transfer_number or amount+date±1day), HistoricalMatcher (fund_transfers, material_purchases, transportation_expenses), CustodianReconciliation (3 named custodians), SpecialReconcilers (carpenter aggregation + loans), ReconciliationService (orchestrator with P1-P4 priority queue), DateResolver (WA timestamp resolution). Non-posting guarantee: only writes to wa_* staging tables.
  - **All endpoints:** requireAuth + requireAdminOrEditor from `server/middleware/auth.ts`.
  - **Key files:** `server/services/whatsapp-import/*.ts`, `server/routes/modules/waImportRoutes.ts`, `shared/schema.ts` (wa_* tables).
  - **Task #4 (Review Dashboard & Posting Engine):** WhatsAppPostingService.ts (atomic posting via pool/client, dual idempotency, re-approval guard), 7 API routes (approve/reject/bulk-approve/dry-run/post/custodian-statements/review-actions), wa-import.tsx React dashboard (4 tabs: batches, review, reconciliation, custodians). Route at `/wa-import` with editor-level access. Posting admin-only.
  - **Comprehensive Wage Calculation Audit (March 2026):** Every SUM(actual_wage) aggregate across the entire codebase replaced with `CASE WHEN actual_wage IS NOT NULL AND != '' AND != 'NaN' THEN actual_wage ELSE daily_wage * work_days END`. Fixed in: ReportDataService.ts (6 locations), reportRoutes.ts (1), DatabaseActions.ts (6), ReportGenerator.ts (1), FinancialIntegrityService.ts (4), workerRoutes.ts (3), settlementRoutes.ts (1), projectRoutes.ts (1). Only exception: FinancialIntegrityService.ts audit check (line 132) intentionally compares actual_wage vs computed wage.
  - **Settlement Security Scoping (March 2026):** All worker settlement queries (v1 reportRoutes, v2 ReportDataService) now enforce project_id/accessibleProjectIds scoping, preventing data leakage from unauthorized projects. v1 `/reports/worker-statement` settlement query uses stmtSettlementFilter with project_id/accessibleIds.
  - **Report Totals Completeness (March 2026):** ProjectComprehensiveReportData.totals extended with totalSupplierPayments, totalProjectTransfersOut, totalProjectTransfersIn. Runtime data now populated in getProjectComprehensiveReport return payload. inventoryIssued section added to PeriodFinal reports (data + Excel + PDF).
  - **storage.ts COALESCE Fix (March 2026):** All workerAttendance date range filters (gte/lte) and orderBy in storage.ts CRUD methods converted from raw `workerAttendance.date` to `COALESCE(NULLIF(date,''), attendanceDate)`. Affected methods: getWorkerStatement, getWorkerStatementByProjects, getWorkerStatementAllProjects, getWorkerAttendanceForPeriod, getExpensesByProject, getWorkerAttendance, createWorkerAttendance duplicate check.
  - **projectRoutes.ts COALESCE Fix (March 2026):** Two remaining orderBy(workerAttendance.date) in project attendance listing and project export converted to COALESCE pattern.
  - **safe_numeric Hardening (March 2026):** Upgraded `safe_numeric(v text, d numeric)` from plain SQL to plpgsql with: btrim + comma removal, explicit NaN/Inf/Infinity rejection (case-insensitive), regex validation `^[+-]?((\d+(\.\d*)?)|(\.\d+))([eE][+-]?\d+)?$` before cast, and `EXCEPTION WHEN others THEN RETURN d` safety net. File: `startup-migration-coordinator.ts`.
  - **NUM() Helper Unification (March 2026):** Replaced ALL `CAST(... AS DECIMAL)` patterns across the entire codebase (~120+ occurrences in 12 files: ReportDataService.ts, reportRoutes.ts, workerRoutes.ts, projectRoutes.ts, financialRoutes.ts, settlementRoutes.ts, storage.ts, FinancialIntegrityService.ts, FinancialLedgerService.ts, SummaryRebuildService.ts, ExpenseLedgerService.ts, DatabaseActions.ts, ReportGenerator.ts) with: `NUM(field)` for Drizzle sql templates, and `safe_numeric(field::text, 0)` for raw SQL queries. Zero `CAST(... AS DECIMAL)` in any operational file. Only non-operational scripts (backfill + old migration) retain the legacy pattern.
  - **Startup Migration Ordering (March 2026):** `runAllStartupMigrations()` is now `await`ed before `server.listen()`, ensuring `safe_numeric` function exists in DB before any HTTP request is served. Previously it ran fire-and-forget.
  - **IDOR Fix — Worker Statement v1 (March 2026):** Both `/reports/worker-statement` and `/reports/worker-statement/:worker_id` now validate that `project_id` parameter is within `accessibleProjectIds` for non-admin users before executing queries. Returns 403 if unauthorized.
  - **Comprehensive Report Supplier Payments Detail (March 2026):** Added detailed supplier payments query to `getProjectComprehensiveReport` returning individual items (supplierName, amount, paymentDate, paymentMethod, referenceNumber, notes). Updated `ProjectComprehensiveReportData` type with `items` array. Added detailed section rendering in both `ProjectComprehensiveExcel.ts` and `ProjectComprehensivePDF.ts` with per-item rows and grand total.

## Enterprise-Grade Security & Quality Hardening (March 2026)
- **DatabaseActions NUM() Complete Conversion:** Eliminated ALL remaining `::numeric` casts in `DatabaseActions.ts` (~20+ instances). Every numeric conversion now uses `NUM()` helper (Drizzle) or `safe_numeric()` (raw SQL). Zero `::numeric` or `COALESCE(NULLIF(...))::numeric` patterns remain in the file.
- **safe_numeric_logged Telemetry Function:** Added `safe_numeric_logged(v text, d numeric, ctx text)` PostgreSQL function that wraps `safe_numeric` and raises a `WARNING` when fallback-to-default occurs on non-empty input. Enables server-log visibility of silent numeric parse failures — critical for financial data integrity auditing.
- **SSH Command Injection Prevention:** Added `validateSSHParam(param, type)` in deployment-engine.ts with strict regex validation for host, user, port, and path parameters. Called in both `buildSSHCommand()` and `buildSCPCommand()` before command construction. Blocks shell metacharacters even if deployment config is compromised.
- **AI Query Schema Restriction:** Added `BLOCKED_SCHEMAS` check in both `executeRawSelect` and `executeCustomQuery` — blocks access to `pg_catalog`, `information_schema`, `pg_toast`. Also enforces `SENSITIVE_TABLES` blocking in raw query paths. Follows principle of least privilege for AI database access.
- **Consolidated parseFloat → safeParseNum:** Replaced all 52 `parseFloat()` calls in DatabaseActions.ts with `safeParseNum()` private method that safely handles null, undefined, empty strings, NaN, and Infinity. Prevents NaN propagation in JavaScript calculations.
- **WhatsAppAIService NUM() Conversion:** Eliminated all 12 remaining `::numeric` casts in `WhatsAppAIService.ts`. Added `NUM()` helper and converted all numeric aggregations to use `safe_numeric()`. Zero `::numeric` in AI service files.
- **Fail-Closed Startup (Verified):** Server exits with `process.exit(1)` if startup migrations fail. `runAllStartupMigrations()` now rethrows errors after logging (previously swallowed). True fail-closed chain: migration error → rethrow → index.ts catch → process.exit(1). Files: `server/index.ts`, `server/db/startup-migration-coordinator.ts`.
- **safe_numeric_logged False-Positive Fix:** Added `btrim(v) NOT IN ('0','0.0','0.00','+0','-0')` check to prevent spurious warnings on valid zero inputs. File: `startup-migration-coordinator.ts`.
- **Shared safeParseNum Utility:** Created `server/utils/safe-numbers.ts` with comma-stripping to match SQL `safe_numeric` behavior. Replaced `parseFloat` in 5 financial service files (ReportDataService, FinancialLedgerService, SummaryRebuildService, ExpenseLedgerService, WellService). Zero `parseFloat` in financial calculation paths.

## System Audit & Cleanup (March 2026)
- **Removed Legacy Files:** `libs/AgentForge_archived/`, `fly.toml`, `Dockerfile`, `docker-compose.signoz.yaml`, `server/services/DrizzleWrapper.ts`, `scripts/_deprecated/`, `pyproject.toml`, `agent_bridge.py`, `remote_analyze.py`, `remote_execute.sh`, 8 stale audit report .md files, `depcheck_report.json`, `audit_scan.json`, `cookies.txt`, `local_deps.txt`, `index.lock`.
- **Fixed Duplicate OTel Init:** Removed `instrumentation.js`, unified to single `server/lib/telemetry.ts` with env-driven config and SIGTERM handler.
- **Fixed Duplicate DB Import:** Removed redundant `import "./db"` from `server/index.ts`.
- **Fixed DB Config Conflict:** Aligned `server/config/env.ts` with `server/db.ts` — removed `DATABASE_URL` (Replit Helium) fallback. Canonical policy: CENTRAL → RAILWAY → NONE.
- **Secured Deployment Scripts:** Removed hardcoded passwords from `deploy.sh`, replaced `StrictHostKeyChecking=no` with `accept-new` in all scripts, switched to `sshpass -e` (env var).

## External Dependencies
- **Monitoring:** OpenTelemetry (single init in `server/lib/telemetry.ts`) and Sentry.
- **WhatsApp:** `@whiskeysockets/baileys` library.
- **Biometrics:** `@simplewebauthn/server` (web), `capacitor-native-biometric` via Capacitor.Plugins (Android/iOS).
- **Database:** PostgreSQL with priority: DATABASE_URL_CENTRAL → DATABASE_URL_RAILWAY → NONE.
- **ORM:** Drizzle ORM.
- **Android Build:** Capacitor + Gradle on remote server (93.127.142.144), auto-versioning via version.properties.
- **Firebase Test Lab:** Robo testing via gcloud CLI on remote server.
- **AI Models:** HuggingFace (Llama 3.1 8B), Gemini 2.0 Flash, OpenAI GPT-4o.
- **Reporting:** ExcelJS for Excel generation.
- **Deployment:** PM2 for process management. SSH supports dual auth: ed25519 key (`SSH_KEY_PATH`, auto-provisioned from `SSH_PRIVATE_KEY_B64`) with `BatchMode=yes StrictHostKeyChecking=yes`, or legacy `sshpass -e` fallback. Auth method auto-detected (`SSH_AUTH_METHOD=key|password|auto`). `known_hosts` provisioned from `SSH_KNOWN_HOSTS_B64` or live `ssh-keyscan`. Git push uses credential helper, no `--force`. Keystore secrets transferred via SCP to temp files (mode 600) — zero interpolation in shell commands. `apk.sh` archived to `scripts/legacy/apk.sh.bak`. Single entry point: `POST /api/deployment/start`. Legacy `/deploy` and `/history` endpoints removed. Docs updated (`ANDROID_BUILD_GUIDE.md`).
- **Deployment Engine Resilience:** Atomic concurrency control via DB transaction (check + insert in single tx, 409 on conflict). Build number generated inside tx to prevent race conditions. Step retry with configurable policy (network steps retry 2×, build steps fail fast). Log writes batched every 2s to reduce DB round-trips. APK download endpoint (`GET /api/deployment/download/:id`) validates file existence/size before streaming, sanitizes SSH params, kills child process on client disconnect.
- **Deployment Engine Security & Stability Hardening (March 2026):** 8 critical fixes applied:
  1. **Path injection prevention:** `validatePath()` rejects shell metacharacters in SSH_KEY_PATH/SSH_KNOWN_HOSTS_PATH before interpolation into buildSSHCommand/buildSCPCommand.
  2. **Cancel/completion race fix:** runPipeline uses CAS-style `WHERE status='running'` for success update + isCancelled check before completion.
  3. **Pipeline classification fix:** `verifyRemoteDeploymentStatus` uses strict Set-based lookup (PIPELINE_WEB_TYPES/PIPELINE_ANDROID_TYPES) instead of substring includes. Rollback → web-only verification.
  4. **Timeout process cleanup:** Promise.race timeout callbacks call `terminateActiveProcesses(deploymentId)` before rejecting (both runPipeline and runPipelineFromStep).
  5. **Rollback build number race fix:** `getNextBuildNumber()` moved inside `pg_advisory_xact_lock` transaction in rollbackDeployment.
  6. **deployerToken in resume/recovery:** Read from deployment record and passed in DeploymentConfig for both resumeDeployment and handleRecoveredSuccess.
  7. **Rollback health enforcement:** Rollback now throws Error when health check returns "down" or "error" instead of logging warning and declaring success.
  8. **Download token expiry:** `generateDownloadToken` embeds 1-hour expiry timestamp. `verifyDownloadToken` validates format, expiry, and HMAC signature.
  9. **Unified SSH in download routes:** Both `/download/:id` and `/app/download/:id` now use `getSSHCommandForDownload()` (delegates to `buildSSHCommand()`) instead of inline SSH with `accept-new`.
  10. **remotePath injection prevention:** `artifactUrl` validated against shell metacharacters and path traversal (`..`) before use in SSH commands in both download endpoints.
  11. **Mandatory download token:** Public `/app/download/:id` requires token via `?token=` query param or `x-download-token` header. Missing token → 401. Invalid/expired → 403. Token auto-generated in `getLatestAndroidRelease()` downloadUrl.
  12. **cancelDeployment CAS:** Uses `UPDATE ... WHERE status='running' RETURNING` and skips log/broadcast if 0 rows updated (already transitioned).
  13. **runPipelineFromStep CAS:** Same CAS pattern at completion — checks `isCancelled()` + `WHERE status='running'` atomic update before declaring success.
  14. **Health Check Pipeline (health-check):** World-class 15-step health check pipeline: HTTP+latency, PM2 processes, disk usage with thresholds, memory+swap, CPU load average, DB connectivity+latency, SSL certificate expiry, Node/npm runtime, Nginx status, network/DNS, file descriptors, active connections, latency percentiles (p50/p95/p99), log error count, final score evaluation (0-100). Results stored in `serverHealthResult` column. Non-blocking (doesn't mutex with deployments).
  15. **Server Cleanup Pipeline (server-cleanup):** Deep 12-step cleanup: Android build artifacts, temp archives, PM2 logs, old APKs (keep last 5 retention), Docker dangling, npm cache, journalctl vacuum, old logs (>7d), git gc --aggressive, orphaned processes, apt cache, summary with total reclaimed MB. Results stored in DB. Non-blocking. Per-step `reclaimedBytes` tracking with structured report.
  16. **Build-Server Self-Healing:** `build-server` step now has `retryPolicy: { maxRetries: 2, delayMs: 15000 }`. On SSH failure (exit 255), automatically clears memory caches (`drop_caches`) and verifies npm cache before retry. Diagnostics logged before build (RAM/Disk usage). Build output saved to `/tmp/build_deploy.log` and error lines extracted on failure. `db-migrate` also has retry (1x, 10s delay).
  17. **TypeScript Error Fixes (March 2026):** Fixed 4 TS compile errors: `transfer_method` → `transferMethod` in financialRoutes audit log, `id` → `transferId` in workerRoutes PATCH handler, `safePaidAmount` scope lifted from inner `if` block to handler level in attendance PATCH.
  18. **CAS Pattern on Failure Paths:** Both `runPipeline` and `runPipelineFromStep` now use `WHERE id=? AND status='running' RETURNING` on failure/cancellation paths (not just success). Prevents race condition where cancelled deployment gets overwritten as `failed`. Notification only sent if CAS succeeds.
  19. **Health Check DB — Dynamic Credentials:** `stepHcDb` now uses `$DATABASE_URL` environment variable instead of hardcoded `psql -U newuser -d newdb`. Works correctly across all environments.
  20. **SSH-Resilient Build (nohup + polling):** `stepBuildServer()` rewritten — runs build as `nohup` background process, monitored every 15s via short SSH sessions. Tracks PID/exit in `/tmp/axion_build_{buildId}.pid|exit|log`. Survives SSH disconnections. Auto-cancel kills remote PID.
  21. **Enhanced Remote Monitor (getRemoteBuildProgress):** Recovery supervisor's remote monitor now fetches detailed build status from server: build state (building/done/failed/idle), log line count, last log line, PM2 process status, dist file existence. Shows real-time progress in deployment console UI via SSE + DB flush.
  22. **Heartbeat System:** Pipeline runner emits in-memory heartbeat every 8s. Recovery supervisor checks heartbeat staleness (45s threshold) before considering deployment orphaned. Prevents race between supervisor and active pipeline runner.
  23. **Universal CAS in Remote Monitor:** All status transitions in remote monitor and recovery supervisor use `casUpdateStatus()` — atomic `WHERE status='running' RETURNING`. Prevents concurrent overwrites between monitor timeout, pipeline completion, and user cancellation.
  24. **Deployment-Scoped Build Markers:** Build PID/exit/log files include deploymentId prefix (`/tmp/axion_build_{buildId}.*`). Eliminates stale state confusion between concurrent or sequential deployments.
  25. **Remote Monitor Step Progress:** Monitor broadcasts `step_progress` events with percentage and descriptive messages. UI shows real-time progress bar even when development environment restarts mid-deployment.
- **Pre-Build Gate (prebuild-gate):** Mandatory pipeline step before any Android APK build. Tests 18 critical mobile API routes across 6 groups (public, auth, core, financial, sync). Verifies CORS for `capacitor://localhost` and `https://localhost`. Validates SSL certificate (>7 days), CSP `connect-src` includes capacitor and localhost. **Multi-source auth:** Tries credentials in priority order: (1) `PREBUILD_SERVICE_EMAIL/PASSWORD` (dedicated service account), (2) `PREBUILD_TEST_PASSWORD`/`DEFAULT_ADMIN_PASSWORD` (legacy), (3) deployer's JWT token as fallback (passed from deployment request). Auth source logged for auditability. **Latency monitoring:** Reports average response time and flags slow routes (>3s). **Infrastructure-aware:** Distinguishes 502/503/504/520-524 + ECONNREFUSED/ENOTFOUND/ETIMEDOUT as infra failures. Auto-retry up to 3× with 15s delay. Config: `server/config/mobile-critical-routes.ts`. Engine: `server/services/prebuild-route-checker.ts`. Manual trigger: `POST /api/deployment/prebuild-check`.
- **Android Readiness Gate (android-readiness):** Checks remote server (93.127.142.144) for: signing env vars (KEYSTORE_PASSWORD/ALIAS/KEY_PASSWORD), keystore file existence, keystore integrity via `keytool -list`, alias match verification, JDK 17/21 availability, Android SDK + build-tools, Gradle wrapper, disk space. Fails pipeline on any critical missing component. Runs before `sync-capacitor`.
- **Gradle Build Hardening:** Release-only builds enforced (no debug fallback). `--stacktrace` added for better error diagnostics. Tail increased to 40 lines for log capture.
- **Post-Deploy Verification (stepVerify):** Enhanced with CORS check (capacitor://localhost preflight), CSP header validation post-deployment. Supplements health check.
- **Preflight Check (preflight-check):** TypeScript compile check (`tsc --noEmit`) and Git status verification before any deployment. Warnings only — does not block.
- **Hotfix Guard (hotfix-guard):** Detects schema/migration file changes in hotfix pipeline and warns that db-migrate is skipped. Suggests using web-deploy/full-deploy instead.
- **Post-Deploy Smoke Test (post-deploy-smoke):** Runs full API route + CORS + SSL + CSP checks against production after deployment. Added to web-deploy, full-deploy, hotfix, git-push pipelines. Alerts on critical failures suggesting rollback.
- **Telegram Deployment Notifications:** Automatic Telegram alerts sent at deployment start, success, failure, and cancellation. Includes pipeline name, version, environment, duration, and error summary.
- **Pipeline Aliasing:** `git-push` → `web-deploy`, `git-android-build` → `android-build`. Legacy names still accepted via `PIPELINE_ALIASES` map but hidden from UI selector. Reduces duplication from 7→5 visible pipelines.
- **Fail-Stop Validation Gates:** `preflight-check` now throws on merge conflicts or >20 TypeScript errors. `post-deploy-smoke` throws on critical route/SSL failures. `verify` throws after 3 failed health check attempts. All gates are now blocking (fail-stop) for critical failures.
- **Atomic Deployment Lock:** `pg_advisory_xact_lock(7777001)` acquired inside `startDeployment` transaction. Eliminates race conditions between concurrent deployment requests. Build number now allocated via atomic counter (`deployment_build_counter` table) inside `startDeployment` tx — replaced unsafe `MAX(build_number)+1` fallback.
- **Build Number Integrity:** `build_number` column has `UNIQUE` constraint (`build_deployments_build_number_unique`). `build_target` column added to persist original target (`server`/`local`) for correct resume behavior.
- **APK Integrity Verification (apk-integrity step):** New pipeline step runs SHA-256 checksum + apksigner/jarsigner signature verification after `sign-apk`. Stores integrity metadata (sha256, signatureValid, verifiedAt) in `environmentSnapshot`. Fails pipeline on invalid signature.
- **Advanced Rollback:** Supports rollback to specific `targetBuildNumber` or `targetCommitHash` via POST body. Commit hash stored in every deployment record. Uses exact `git checkout <hash>` instead of `HEAD~1`.
- **Resume-from-Step:** `POST /api/deployment/:id/resume` resumes failed deployments from first failed step. Resets failed/cancelled steps to pending, runs pipeline from that point. UI shows "استئناف" button on failed deployments. Fixed: `cleanupDeploymentState` used instead of missing `cleanupDeployment`. **Fixed:** Now reads original `buildTarget` from stored deployment record instead of hardcoding `"server"` — ensures local deploys resume on the correct pipeline.
- **Atomic Rollback Lock:** `pg_advisory_xact_lock(7777001)` inside rollback transaction prevents concurrent rollback/deployment conflicts.
- **Step-Level Timeout:** Per-step timeout limits via `STEP_TIMEOUT_MS` with `Promise.race`. Steps exceeding limits marked failed with Arabic error message.
- **Safe Database Migration:** `stepDbMigrate` requires `AUTO_DB_MIGRATE=true`. Creates pg_dump backup before migration, runs dry-run, blocks dangerous ops (DROP/TRUNCATE). Fails if backup or pg_dump unavailable. Fixed: removed duplicate BACKUP_FAILED check (dead code).
- **Android Download Token:** HMAC-SHA256 signed download URLs with 24h TTL. Requires `APP_SECRET` or `SESSION_SECRET` (no default secret fallback). Fixed: uses `crypto.timingSafeEqual` for timing-safe comparison, rejects future timestamps.
- **Rollback Pipeline:** `rollback` added as first-class Pipeline type with defined steps (`validate`, `rollback-server`, `restart-pm2`, `verify`). Rollback now records `triggeredBy` for audit trail. Resume explicitly blocks rollback-type deployments.
- **Resume Atomic Lock:** `resumeDeployment` now uses `pg_advisory_xact_lock(7777001)` inside a transaction to prevent concurrent resume/deploy conflicts.
- **Signal-Aware Execution:** `execWithLog` distinguishes between `code===0` (success), `code!==0` (failure), and `signal` (killed by signal) — previously treated killed processes as successful.
- **Dynamic Branch Support:** `stepGitPush` and `stepPullServer` now use `config.branch` instead of hardcoded `main`. Branch is sanitized via `sanitizeShellArg()`.
- **SSH Auth Unified:** `stepRetrieveArtifact` now uses `buildSSHCommand()` instead of manually constructing SSH with `sshpass` and `StrictHostKeyChecking=accept-new` — eliminated MITM risk.
- **Keystore Secret Cleanup:** Gradle build uses `trap 'rm -f /tmp/.ks_pass /tmp/.ks_key_pass' EXIT` ensuring secrets are deleted even on build failure (was chained with `&&` — leaked on failure).
- **Branch Sanitization:** `sanitizeShellArg` now allows `/` for branch names like `feature/x`, with `..` path traversal stripped.
- **DB Backup Permissions:** Pre-migration `pg_dump` backup files now have `chmod 600` applied immediately after creation.
- **Cleanup:** Removed stale `shared/schema.ts.remote` (0-byte file).
- **App Update System:** `appUpdateChecker.ts` checks for updates every 4 hours with idempotent resume listener, dismiss per versionCode, and force-update support.
- **Notification Permissions:** `notificationPermission.ts` implements Android 13+ POST_NOTIFICATIONS state machine.
- **Process Management:** Deployment engine uses `detached: true` process groups and `process.kill(-pgid)` for clean process tree termination on cancel.
- **QR Code Generation:** `qrcode` package.
- **XSS Protection:** DOMPurify for sanitizing HTML in PDF generation.
- **Professional Notification System (Provider Pattern):**
  - `server/services/deployment-notifications/` — modular notification architecture
  - **types.ts:** `DeploymentNotificationPayload` (discriminated union, 5 event types), `NotificationProvider` interface, `PIPELINE_LABELS`, `CRITICAL_STEPS`, `FAILURE_SUGGESTIONS`, `STEP_LABELS`, `formatDuration`, `escapeHtml`
  - **DeploymentNotificationPublisher.ts:** Singleton fan-out publisher with `Promise.allSettled`, dedup protection, lazy provider registration
  - **TelegramDeploymentProvider.ts:** 5 rich HTML formatters (started/success/failed/cancelled/prebuild_gate_failed) with commit hash, branch, step-by-step status, security checks, artifact SHA-256, timeline, failure suggestions
  - **deploymentPayloadBuilder.ts:** 6 async builders that fetch deployment/events from DB, build rich payloads with timeline (capped at 20 entries), security checks, artifact info
  - Integration: `sendDeploymentNotification` in deployment-engine.ts uses PayloadBuilder + Publisher. `sendPrebuildGateNotification` sends gate failure before throw. Providers registered lazily on first notification send.
- **TypeScript Fixes:** useRef initialValue (React 19), HeadersInit union fix in webauthn.ts, transferDate never-type fix in financialRoutes.ts — **zero TypeScript errors**.
- **Notification Quality Fixes (Architect Review):**
  - `triggeredBy` now sends display name (full_name/first_name/email) instead of UUID
  - Started notification uses resolved version from `getCurrentVersion()` instead of `v0.0.0`
  - Failed notification shows `failedStep` label (e.g. "التحقق" instead of silent omission)
  - Error messages sanitized: SSH key paths → `[SSH_KEY_PATH]`, IP addresses → `[SERVER_IP]`
  - Truncation increased from 300→800 chars with `…` ellipsis
  - Explicit URL line (`🌐 https://...`) added to all 5 notification types for clickability
  - `consoleUrl` no longer uses `REPLIT_DEV_DOMAIN` — prioritizes `APP_BASE_URL` → `PRODUCTION_URL` → hardcoded
  - Added `FAILURE_SUGGESTIONS` for `validate` and `preflight-check` steps (SSH/network diagnostics)
- **Structured Deployment Logger (`server/services/deployment-logger.ts`):**
  - Structured JSON logs with traceId (deploymentId), step, level, metadata
  - DORA metrics: deployment frequency, lead time, MTTR, change failure rate (30-day window)
  - Step timing: start/end/duration with running/success/failed/skipped states
  - Log levels: debug/info/warn/error/fatal with overloaded step-aware signatures
  - Summary report generation (generateSummaryWithContext) with full pipeline context
  - Persists structured logs to deployment events table
  - API endpoint: `GET /api/deployment/dora-metrics` (admin-only)
- **Pipeline-as-Code (`server/config/pipeline-definitions.ts`):**
  - Externalized pipeline configurations — single source of truth for all pipeline steps
  - Type-safe step registry with timeout, retry policy, and conditional execution
  - Pipeline validation (unknown steps, missing critical steps, timeout sanity)
  - `isPipelineSupported()` replaces hardcoded validPipelines arrays in routes
  - `listAvailablePipelines()` exposes pipeline metadata via `GET /api/deployment/pipelines`
  - `PIPELINE_ALIASES` moved here from deployment-engine.ts (removed duplication)
- **RBAC & Deployment Approval System:**
  - New tables: `deployment_approvals`, `deployment_permissions` (89 total tables)
  - `checkDeployPermission` middleware: validates pipeline+environment access per user
  - Admin/super_admin roles bypass RBAC (auto-pass)
  - Non-admin users require explicit `deployment_permissions` record
  - `requireApproval` middleware: creates pending approval for production deploys
  - `checkDailyLimit`: enforces max daily deployments per user (fail-closed on error)
- **SSH Security Hardening:**
  - Production requires key-based SSH by default (`SSH_AUTH_METHOD=key`)
  - Password auth requires explicit `ALLOW_SSH_PASSWORD=true` env var
  - Auto-corrects key permissions to 600
  - `StrictHostKeyChecking=accept-new` removed for production paths
  - SSH key validation at deployment start (fail fast)
- **Integration Architecture:**
  - DeploymentLogger wired into `runPipeline` (stepStart/stepEnd/summary)
  - Pipeline validation inside try/finally — guarantees cleanup on all paths
  - `cleanupLogger(deploymentId)` called in both success and error paths
  - `cleanupDeploymentState` always runs via finally block