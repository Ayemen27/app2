# Project: Professional AI Agent Workspace

## التغييرات الأخيرة (2026-04-21)
- **أمن JWT**: توحيد TTL = 14 يوم في `server/auth/jwt-utils.ts` (كان 90 يوم في بعض المسارات).
- **تسرّب ذاكرة Cache**: إضافة `destroy()` + الاحتفاظ بمرجع `setInterval` + `unref()` في `server/services/MemoryCacheService.ts`، وتنظيفه عند الإغلاق في `server/index.ts`.
- **Race condition في تحويلات المشاريع**: لفّ `createProjectFundTransfer` بـ `db.transaction` مع `.for('update')` row locks في `server/storage.ts`.
- **getWorkersWithMultipleProjects**: استبدال الـ stub بتنفيذ حقيقي عبر CTE + window function.
- **NotificationQueueWorker**: ربطه بدورة حياة الخادم في `server/index.ts` (start/stop)، معطّل افتراضياً لأن جدول `notification_queue` غير موجود في DB ولا معرّف في `shared/schema.ts` (تفعيل صريح: `NOTIFICATIONS_WORKER_ENABLED=true`).
- **Command Injection (P0)**: استبدال `spawn("bash", ["-c", ssh...cat ...])` بـ SFTP عبر `ssh2` في موضعَي تنزيل APK في `server/routes/modules/deploymentRoutes.ts`. أُضيف `server/services/sftp-client.ts` كطبقة موحّدة (`statRemoteFileSize`, `openRemoteReadStream`).
- **ترقية حزم**: `drizzle-orm`, `axios`, `nodemailer`, `ssh2` (+ `@types/ssh2`) إلى أحدث إصدار.

## Overview
This Node.js application is a professional AI Agent Workspace designed for construction project management. Its primary purpose is to enhance decision-making through data analysis, streamline operations, and improve communication efficiency within construction projects. Key capabilities include WhatsApp integration for user interaction, an advanced AI agent for database operations and queries, comprehensive reporting, and a granular project permission system. The project aims to deliver a state-of-the-art, AI-powered platform for the construction industry.

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
The system features a consistent design with a professional navy/blue palette, English numerals, and British DD/MM/YYYY date formats. User preferences for language, dark mode, font size, and notifications are persistently stored. Frontend pages are designed for AI chat, WhatsApp setup, notification management, various report generations (Daily, Worker Statement, Period Final, Multi-Project, Project Comprehensive), and detailed permission management. Floating Action Buttons (FAB) are used for dynamic UI interactions.

### Technical Implementations
- **Core Technologies:** Node.js with Express.js (backend) and Vite (client-side).
- **Database & ORM:** PostgreSQL with Drizzle ORM, ensuring atomic financial transactions.
- **Authentication & Security:** JWT-based authentication with access/refresh tokens, WebAuthn/FIDO2 for biometric login, robust rate limiting, token hardening (httpOnly cookies), mass-assignment protection, API response hardening, SQL injection prevention, centralized RBAC, strict CORS, and comprehensive session security (stable multi-device sessions, per-device revocation).
- **AI Agent:** Processes natural language messages for database CRUD, introspection, and analytics on whitelisted tables, restricting raw SQL execution to SELECT-only queries. It includes query optimizations and specific ACTION commands for well management. Arabic intent detection is supported. **WhatsApp AI-First Architecture:** The WhatsApp bot uses a truly AI-first conversation engine. Message processing order: (1) quick nav shortcuts (0/#/cancel), (2) active multi-step flows (expense entry, export wizard), (3) image analysis (OCR+AI), (4) AI agent for everything else. No regex fast-paths exist before AI — the AI decides intent. Greeting detection uses exact-match only (not `includes()`), so compound messages like "صباح الخير كم رصيد أحمد" go to AI, not the welcome menu. Dynamic user context (name, role, isAdmin, canRead, canAdd, project names) is injected into every AI request. The AI can trigger structured flows via ACTION commands: `START_EXPENSE` initiates the expense entry wizard, `START_EXPORT_WORKER` initiates worker statement export. Permission checks (`canRead`/`canAdd`) are enforced at the action level, not as a blanket conversation block — `parseAndExecuteActions` hard-blocks all DATA_READ_ACTIONS when `canRead=false` and ADMIN_ONLY_ACTIONS for non-admins. A deterministic `detectFlowFallback` regex safety net catches expense/export patterns when AI fails to produce the expected ACTION, ensuring flow reliability even when the model underperforms. Legacy regex-based `detectIntent`/`executeIntent` removed in favor of AI-driven intent understanding.
- **WhatsApp Integration:** Utilizes the Baileys library for multi-user sessions with security isolation. **CRITICAL: Single Bot Consumer pattern** — env `WHATSAPP_BOT_ENABLED=false` in dev to prevent duplicate responses (dev + prod both connect to same WA number). Set to `true` only in production.
- **Deployment Engine & Bot-T Sync:** PM2 process name is versioned as `AXION-v{version}`. After each deployment/rollback, `syncBotTInventory()` updates `/opt/Bot-T/apps_inventory.yaml` pm2_name to match the new versioned name. This ensures Bot-T (server management bot) can always manage AXION.
- **SEO & Google Crawling:** `robots.txt` (allows public pages, blocks /api/ and auth-required routes), `sitemap.xml` (public pages only), full Open Graph + Twitter Card meta tags, JSON-LD structured data (WebApplication schema), canonical URL, meta description/keywords. Server routes in `server/index.ts` serve `robots.txt` and `sitemap.xml` with proper Content-Type and caching. `X-Frame-Options: SAMEORIGIN` enabled for clickjacking protection. **Privilege escalation fix (2026-04-01):** `POST /allowed-numbers` now creates an independent user (role=user, synthetic email `wa_{phone}@whatsapp.local`) per allowed number instead of linking to the admin's account. `WhatsAppSecurityContext.fromPhone()` no longer auto-links unknown phones to `addedBy` admin — if `allowed_numbers.linkedUserId` doesn't match the existing `whatsapp_user_links.user_id`, the old link is rejected. Deactivating/deleting an allowed number cascades to disable the corresponding `whatsapp_user_link`. New `PATCH /allowed-numbers/:id/permissions` endpoint enables per-number permission management (canRead/canAdd/canEdit/canDelete, scopeAllProjects, projectIds). Frontend enhanced with inline permissions UI. Schema: `whatsapp_allowed_numbers.linked_user_id` column added. Features Arabic NLP for normalization, dialect mapping, typo correction, and context-aware suggestions. A multi-phase AI-powered pipeline converts WhatsApp conversations into structured financial entries with mandatory human approval. The pipeline uses AI models (via AIExtractionOrchestrator.ts and ModelManager.ts) for: name extraction (person/company identification from conversation context), financial transaction analysis (type, amount, sender, recipient), image/document analysis (transfer receipts, invoices via OCR + AI), project inference, and confidence scoring with reasons. All AI services have regex fallback when AI models are unavailable. Pipeline stages: ingest → extract_names (AI) → user_links_names → analyze_financially (AI) → reconcile → auto-link → verify → post.
- **AI Enhancements (Latest):** AI prompts upgraded with few-shot examples (3-5 per function) covering Yemeni dialect edge cases, compound messages, and false positives. Zod schema validation enforces structured output from AI models before database insertion. AIMetricsService tracks AI hit-rate, fallback-rate, latency, and confidence distribution per batch (GET /api/wa-import/batch/:id/metrics). AutoLinkingService auto-links extracted names/transactions to existing workers/suppliers/projects with confidence scores, displayed in a dedicated verification UI tab with color-coded confidence badges (green >85%, yellow 60-85%, red <60%), individual accept/reject, and bulk approve for high-confidence links (>90%). **Multi-key rotation system:** Each provider supports multiple API keys (DEEPSEEK_API_KEYS, OPENAI_API_KEYS, GEMINI_API_KEYS, HUGGINGFACE_API_KEYS as comma-separated). When one key hits rate limits (429/402), the system automatically rotates to the next available key before falling back to the next provider. Provider priority: DeepSeek(7keys) → HuggingFace(6keys) → Gemini(7keys) → OpenAI(7keys) = 27 total keys. Keys auto-recover after 5 minutes. GET /api/wa-import/ai-status returns live model availability with per-provider key counts. Extraction supports resume mode — re-running on a batch with existing candidates skips already-processed messages instead of blocking.
- **Project Permissions & Data Isolation:** A granular system enforces user access to projects and data, ensuring non-admin users only view authorized information.
- **Reporting System:** Generates professional daily, worker statement, period-final, multi-project-final, and project-comprehensive reports. Reports are exportable to Excel and PDF with RTL support, aggregating key project metrics like workforce, wells, attendance, expenses, cash custody, and equipment with KPIs. Supplier payments are included in period final and comprehensive reports. **Unified Worker Balance Formula:** `remaining = earned(actualWage) - paidCash(paidAmount) - transfers(non-settlement) - settlements(from_project only, direction-aware) + rebalanceDelta`. This formula is consistently applied across worker card stats, worker statement PDF, and project comprehensive report. Settlement transfers (`transfer_method='settlement'`) are excluded from regular transfers to prevent double-counting with `worker_settlement_lines`. **Settlement direction fix (2026-03-31):** Comprehensive report now only counts settlements where `from_project_id` matches the current project (outgoing settlements). Previously `(from_project_id OR to_project_id)` caused double-counting. Worker statement now correctly distinguishes debit vs credit based on settlement direction. A dedicated "التسويات" (Settlements) column was added to comprehensive report PDF, Excel, and web UI. **Project balance fix (2026-03-31):** Comprehensive report `project_fund_transfers` queries (both incoming and outgoing) now exclude `transfer_reason='legacy_worker_rebalance'` to match `ExpenseLedgerService` logic. Previously, rebalance transfers were included in the report but excluded from the projects page, causing artificial balance discrepancies (e.g., -117,248 deficit that didn't exist). **Settlement PFT double-count fix (2026-03-31):** Settlement creates both `worker_transfers` (transfer_method='settlement') and `project_fund_transfers` (transfer_reason='settlement'). Previously both were counted in project balance computation, causing source projects to show 2x settlement expense. Fix: all project_fund_transfers queries for balance calculation now exclude transfer_reason='settlement' alongside 'legacy_worker_rebalance'. Each project's settlement expense comes only from worker_transfers (its own share). Affected: ExpenseLedgerService.ts (4 queries, day+range), ReportDataService.ts (getDailyReport, getProjectComprehensiveReport, getPeriodFinalReport). **Settlement preview rebalance fix (2026-03-31):** `calculatePreviewData` in `settlementRoutes.ts` now includes `rebalanceDelta` (from `legacy_worker_rebalance` project_fund_transfers) in worker balance calculation for settlement eligibility. Formula: `balance = earned - paid - transferred(non-settlement) - settled(from_project) + rebalanceDelta`.
- **Notifications:** Comprehensive in-app notification system with local notifications for Android via Capacitor.
- **Offline Capabilities:** Offline-first PWA design using Service Worker for caching and IndexedDB for extensive offline data storage, including crash recovery.
- **Data Integrity & Financial System:** Robust handling of `NaN` values and empty timestamp strings. Critical fixes ensure double-entry accounting principles, with a `FinancialIntegrityService` for worker balance synchronization, audit logging, and reconciliation. Financial guards prevent overpayments and enforce material purchase integrity. All financial calculations consistently use `actual_wage` and `safe_numeric` for numerical precision. DB triggers invalidate summaries, and foreign key constraints enforce referential integrity.
- **Deployment Engine:** Features a robust deployment pipeline system supporting web and Android builds. Includes security hardening (path/command injection prevention), atomic locks for concurrency, fail-closed startup, comprehensive health checks, server cleanup, build-server self-healing, pre-build and Android readiness gates, post-deploy verification, hotfix guards, and Telegram notifications. Supports advanced rollback and resume-from-step functionalities. Integrates with a structured deployment logger and a pipeline-as-code configuration. Implements RBAC and an approval system for deployments, along with daily deployment limits. Enhanced SSH security with key-based authentication enforced for production. **Android build reliability fixes (2026-03-31):** (1) Unified `getSSHExecEnv()` method ensures SSHPASS env var is passed to every SSH `execAsync` call — previously `stepValidate` and 47 other calls were missing it, causing "Permission denied" failures when only `SSH_PASSWORD` was set. (2) Prebuild gate now treats HTTP 429 (rate limited) as a passing result with warning instead of a critical failure — prevents false build aborts when API routes are throttled. (3) Gradle launch SSH timeout increased from 30s to 60s for transport resilience.

## External Dependencies
- **Monitoring:** OpenTelemetry and Sentry.
- **WhatsApp:** `@whiskeysockets/baileys`.
- **Biometrics:** `@simplewebauthn/server` (web) and `capacitor-native-biometric` (Android/iOS).
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **Android Build:** Capacitor, Gradle, and Firebase Test Lab.
- **AI Models:** HuggingFace (Llama 3.1 8B), Gemini 2.0 Flash, OpenAI GPT-4o.
- **Reporting:** ExcelJS.
- **Process Management:** PM2.
- **Deployment:** SSH, `sshpass`, Git.
- **QR Code Generation:** `qrcode` package.
- **XSS Protection:** DOMPurify.

## Security Hardening (Latest)

### Environment Variables — No Hardcoded Secrets
All sensitive values (IP, domain, DB credentials, SSH credentials) are sourced exclusively from environment variables. **No hardcoded fallbacks** for critical config:
- `SSH_HOST`, `SSH_USER` → throw if missing
- `PRODUCTION_URL`, `PRODUCTION_DOMAIN` → empty string fallback (non-critical) or throw (SSH/deploy)
- `SESSION_SECRET` → throw if missing (encryption.ts)
- `ALLOWED_DOMAIN_SUFFIXES` → env var, no hardcoded domain list

### Required Environment Variables
| Variable | Where | Purpose |
|---|---|---|
| `SSH_HOST` | Server | SSH deployment target IP |
| `SSH_USER` | Server | SSH username |
| `SSH_PASSWORD` / `SSHPASS` | Server | SSH authentication |
| `PRODUCTION_URL` | Server | Full production URL with protocol |
| `PRODUCTION_DOMAIN` | Server | Production domain with protocol |
| `VITE_PRODUCTION_DOMAIN` | Client | Client-side production domain |
| `VITE_PRODUCTION_HOSTS` | Client | Comma-separated production hostnames |
| `ALLOWED_DOMAIN_SUFFIXES` | Server | CORS allowed domain suffixes |
| `SESSION_SECRET` | Server | Encryption key — required, no fallback |
| `DB_NAME`, `DB_USER` | Server | Database health check params |
| `DATABASE_URL_CENTRAL` | Server | Primary database connection |

### Error Handling Policy
- All `catch {}` blocks in critical paths log errors via `console.warn/error`
- Silent `catch {}` is only acceptable for cleanup operations (process.kill, child.kill, unlinkSync, URL parsing in CORS)
- Functions must not return `null/[]` silently — either throw or log warnings

## WhatsApp Data Audit & Source Tracking
- **Source Tagging:** All financial records imported from WhatsApp are tagged with `[مصدر: زين]` or `[مصدر: العباسي]` in their notes field to indicate which conversation they originated from.
- **Meal Records:** Meal entries (صبوح/غداء/عشاء) are tagged with specific worker names (السيد احمد، عبدالله عادل، etc.) from the original conversation context.
- **Worker Expense Classification:** Records previously classified as "متنوعة:" (miscellaneous) that are actually worker-specific expenses have been reclassified to "مصروف عامل:" with the worker's name.
- **Date Corrections:** 21 records had dates corrected from confidence_breakdown_json data to match original conversation/Excel file dates.
- **Budget Integrity:** All reclassifications and tagging operations preserved the original amounts — budget remains 100% balanced.
- **Worker Balance Report Fix (Task #1 merged):** The comprehensive report's "Top 20 Workers" section now correctly subtracts worker_transfers (including settlements/تصفية) from the balance calculation. A new "الحوالات" (transfers) column is visible in both PDF and Excel reports.
- **Date Casting Fix:** All SQL date comparisons in `ReportDataService.ts` (18+ locations) now use `::date` casting on both sides (`column::date >= $N::date`) to prevent `operator does not exist: text >= date` errors. Affected tables: worker_attendance, material_purchases, transportation_expenses, worker_misc_expenses, worker_transfers, project_fund_transfers, supplier_payments, inventory_transactions, worker_settlements. Both raw SQL queries and Drizzle ORM filters (getWorkerStatement) were fixed.
- **Payment Allocation System (ERP):** Multi-project worker payment distribution system following ERP Open Item standards. Key files: `server/services/PaymentAllocationService.ts` (getWorkerOpenBalances, suggestAllocation proportional/FIFO, executeAllocation with atomic transactions + auto project_fund_transfers, reverseBatch), API endpoints in `workerRoutes.ts` (GET /api/workers/:id/open-balances, POST /api/worker-transfers/suggest-allocation, POST /api/worker-transfers/allocate), Frontend allocation UI in `worker-accounts.tsx` (allocation mode toggle, distribution table, proportional/manual allocation buttons). Schema additions: `batch_id` + `allocation_source_project` columns in worker_transfers. Worker stats API returns `isMultiProject` + `projectsCount` for multi-project badge display in `workers.tsx`.
- **Legacy Worker Rebalance System:** Admin-only tool to fix old worker accounts with negative balance in one project and positive in another. Key files: `server/services/LegacyRebalanceService.ts` (getImbalancedWorkers, generateRebalancePlan, preview with project fund balances before/after, execute with atomic fund_transfers + journal_entries + balance sync, reverseRebalance). API: GET /api/worker-rebalance/imbalanced-workers, GET /api/worker-rebalance/preview/:workerId, POST /api/worker-rebalance/execute, POST /api/worker-rebalance/reverse. Frontend: `client/src/pages/worker-rebalance.tsx` — shows all imbalanced workers, preview dialog with worker balances + project fund balances (before/after), dual confirmation, auto-generated notes. Route: /worker-rebalance. Sidebar: "تسوية الأرصدة" under workers section (admin-only).
- **DB Performance Hardening (2026-03-31):** Connection pool sizes reduced to prevent overloading the remote PostgreSQL server (93.127.142.144). Main pool: 20→8 max connections, SmartConnectionManager local pool: 10→5, dynamic discovery pools: 5→3. `getAllProjectsStats` changed from unbounded `Promise.all` (all projects in parallel = N×12 concurrent queries) to batched execution (3 projects at a time = max 36 concurrent queries). Startup migrations changed from conditional soft-fail (checks `safe_numeric` existence; if present, continues; if missing, exits). Connection/query timeouts reduced (connectionTimeoutMillis: 30s→15s, query_timeout: 60s→30s) to prevent connection starvation from hung queries.

## Enterprise Architecture Audit & Phase 1 Fixes (2026-03-31)

### Completed Phase 1 — Critical Security & Data Integrity Fixes

**1. Emergency Mode Hardening (`server/middleware/auth.ts`):**
- Emergency users now enforced as **read-only** — all POST/PUT/PATCH/DELETE requests blocked with 403 (except `/api/auth/`)
- Emergency user role downgraded to `viewer` for write operations
- `isEmergencyMode` flag added to user context for downstream checks
- Prevents unauthorized financial mutations during DB outage

**2. Settlement Idempotency at DB Level (`server/routes/modules/settlementRoutes.ts`):**
- Added `idempotency_key` column to `worker_settlements` table with unique partial index (WHERE status='completed')
- Settlement execution now acquires `pg_advisory_xact_lock` inside the transaction — prevents concurrent settlement for same project
- Removed race-prone "recent duplicate" check (10-second window outside TX) — replaced by DB-enforced uniqueness
- Idempotency key stored as proper column instead of embedded in notes text

**3. Suspicious Activity Tracking Reactivated (`server/middleware/auth.ts`):**
- Was completely disabled (`next()` passthrough) — now fully functional
- Tracks failed auth attempts (401/403 responses) per IP
- Auto-blocks IP after 15 failed attempts in 15 minutes (30-minute block)
- Block state tracked in memory with automatic expiry

**4. Silent Error Handling Fixed:**
- `CentralLogService.ts`: 5 empty `catch {}` blocks replaced with `console.warn` logging
- `error-tracking.ts`: Empty catch in HTTP event logging now logs warning
- All background flush operations now report failures instead of swallowing them

## Phase 2 — Performance (Completed 2026-03-31)

**1. BatchFinancialStatsService (`server/services/BatchFinancialStatsService.ts`) — NEW:**
- Replaces N×13 individual SQL queries per project with a **single CTE query** for all projects at once
- For 20 projects: reduced from 260 queries → 1 query per `/api/projects/with-stats` request
- Covers: material_cash, material_credit, worker_wages, transportation, worker_transfers, misc_expenses, fund_transfers, project_transfers (in/out), workers aggregate, supplier_payments
- Returns structured `ProjectFinancialStats` objects with pre-computed totals

**2. MemoryCacheService (`server/services/MemoryCacheService.ts`) — NEW:**
- Unified in-memory cache with TTL expiry, LRU eviction, tag-based invalidation
- Cache keys grouped by tags (project-stats:{id}, all-project-stats)
- Hit/miss/eviction metrics accessible via `GET /api/health/cache/metrics` (admin only)
- Manual cache clear via `DELETE /api/health/cache/clear` (admin only)
- Replaces scattered `Map<string, ...>` caches throughout projectRoutes.ts

**3. Automatic Cache Invalidation (`financialRoutes.ts`, `workerRoutes.ts`):**
- Response interceptor middleware on both routers: after any successful POST/PUT/PATCH/DELETE, automatically invalidates stats cache for the affected project
- No manual cache invalidation code needed in individual handlers
- `invalidateProjectStats()` exported from MemoryCacheService — no circular dependencies

**4. Trusted IP Whitelist for Suspicious Activity Tracker (`server/middleware/auth.ts`):**
- CRITICAL BUG FIX: localhost (127.0.0.1, ::1, ::ffff:127.0.0.1) was being blocked after internal health checks triggered 15 failed auth attempts
- Added `isTrustedIp()` function — private/loopback IPs bypass the suspicious activity tracker entirely
- Prevents self-DoS during startup health checks

## Phase 3 — Deep Performance Optimization (Completed 2026-03-31)

**1. PostgreSQL Server Tuning (93.127.142.144 — 3.8GB RAM / 2 vCPU):**
- `shared_buffers`: 128MB → 1GB
- `work_mem`: 4MB → 8MB
- `effective_cache_size`: 4GB → 2.5GB (matches actual RAM)
- `random_page_cost`: 4 → 1.2 (VPS/SSD optimized)
- `effective_io_concurrency`: 1 → 200 (SSD optimized)
- `maintenance_work_mem`: 64MB → 256MB
- `wal_buffers`: 4MB → 16MB
- `max_connections`: 100 → 50 (right-sized)
- `log_min_duration_statement`: disabled → 500ms (slow query logging enabled)
- `track_io_timing`: on (I/O performance monitoring)
- Config stored in `/etc/postgresql/16/main/conf.d/performance.conf`

**2. Critical Index Creation (17 new indexes):**
- `auth_user_sessions`: 4 partial indexes (WHERE is_revoked=false) — fixed 175,438 excess seq scans
- `worker_transfers`: 3 indexes (project+date, worker+date, date) — fixed 234,867 excess seq scans
- `material_purchases`, `fund_transfers`, `transportation_expenses`, `worker_misc_expenses`, `well_expenses`: date+project composite indexes
- `notification_read_states`: user+notification index (was 13,693 seq scans, 1 idx scan)
- `journal_lines`, `central_event_logs`, `monitoring_data`: proper indexes added
- Result: queries now use Index Scan (0.14ms) instead of Sequential Scan

**3. Non-Sargable Date Query Elimination:**
- Replaced all `CAST(col AS TEXT)` + `SUBSTRING()` + regex patterns with direct text comparison
- Affected files: `projectRoutes.ts`, `financialRoutes.ts`, `SummaryRebuildService.ts`
- Text date columns (YYYY-MM-DD format) are lexicographically sortable — no casting needed
- Pattern: `COALESCE(NULLIF(col, ''), '1970-01-01') = $1` for equality, direct `col >= $1 AND col <= $2` for ranges

**4. SmartConnectionManager Lazy Discovery:**
- Startup: only initializes primary + Supabase connections (2 connections max)
- Discovery of 14 additional databases deferred 10 seconds after startup (non-blocking)
- Controlled by `ENABLE_EAGER_DB_DISCOVERY=true` env var for opt-in eager loading
- Result: startup time reduced from ~33s blocking to immediate readiness

**5. Architect Review Fixes (Post-Review):**
- CRITICAL: Fixed `fund_transfers.transfer_date` (TIMESTAMP) queries — was using `::text` (produces `2025-06-03 00:00:00`), now uses `::date` (produces `2025-06-03`) for correct comparison
- Fixed ALL trigger functions in SummaryRebuildService: replaced `SUBSTRING(CAST(...AS TEXT),1,10)` with `::date::text` for timestamp columns (`fund_transfers`, `project_fund_transfers`), direct column access for text date columns (`worker_transfers`, `supplier_payments`)
- Removed 6 redundant/duplicate indexes: `idx_fund_transfers_project_date`, `idx_material_purchases_project_purchase_date`, `idx_material_purchases_project_date`, `idx_transportation_expenses_project_date`, `idx_transport_expenses_project_date`, `idx_worker_transfers_project_date`
- Added expression index `idx_fund_transfers_date` on `(transfer_date::date)` for sargable date queries
- Reduced `shared_buffers`: 1GB → 768MB, `effective_cache_size`: 2.5GB → 2GB (safer for 3.8GB server with swap pressure)

### Dead Code Cleanup (Completed)
Comprehensive audit performed: 34 dead/orphan files removed:
- **Pages:** Tasks.tsx (unrouted), dashboard/index.tsx (duplicate of dashboard.tsx)
- **Components:** EnhancedErrorDisplay, form-error-handler, SyncStatus.tsx + SyncStatusHeader.tsx (duplicate of sync-status.tsx), admin-notifications/index.ts (empty barrel)
- **UI (unused shadcn):** accordion, aspect-ratio, auto-width-input, breadcrumb, carousel, chart, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, resizable
- **CSS:** worker-account-print.css, excel-print-styles.css, axion-reports.print.css (all unimported)
- **Hooks:** useWorkersSettlementValidation.ts + use-workers-settlement-validation.ts (duplicates, both unused)
- **Server:** systemRoutes.ts (imported but never registered with app.use()), removed from REGISTERED_ROUTE_FILES
- **Misc:** t6 txt, apk.sh.bak, diag_helper.js, logo_header_light3.png (duplicate), firebase-test-results/ directory

**Preserved (verified used):** CircuitBreaker.ts, ModelManager.ts, ArabicNormalizer.ts, InteractiveMenu.ts, backup/* (ddl-generator, integrity-checker, restore-engine, streaming-restorer), routes.ts (initializes Telegram/GoogleDrive), unified-print-styles.css (imported in worker-accounts.tsx)

### WhatsApp Bot Startup Logic (Hardened)
Bot now runs **only** in production by default. Logic: `botEnabled = botExplicitlyEnabled || (isProduction && !botExplicitlyDisabled)`.
- Production (NODE_ENV=production): starts automatically unless WHATSAPP_BOT_ENABLED=false
- Development: never starts unless WHATSAPP_BOT_ENABLED=true explicitly
- Log message includes both env and WHATSAPP_BOT_ENABLED value for debugging

### Security Vulnerabilities Fix (Completed)
Reduced npm audit from **38 vulnerabilities (4 critical, 20 high)** to **8 low** only:
- **Removed:** `scp2` (unused, carried ssh2 critical + lodash critical), `path-to-regexp` (unused direct dep), `xlsx` (prototype pollution + ReDoS, no fix available)
- **Replaced:** `xlsx` → `exceljs` in server/services/whatsapp-import/MediaProcessingService.ts (Excel text extraction) and removed unused import from transport-management.tsx
- **Upgraded:** nodemailer, firebase-admin, @rollup/plugin-terser, @capacitor/cli, @capgo/capacitor-native-biometric, axios, jspdf, express-rate-limit chain
- **Remaining 8 low:** All from firebase-admin internal dependency chain (google-gax → protobufjs, @tootallnate/once, teeny-request) — no fix without breaking downgrade

### Comprehensive Audit & Fixes (Completed)
**Audit Date:** 2026-04-01 — Full system audit with 37 checks across 6 categories.
- **Domain typo fixed:** `binarjoinanelytic` → `binarjoinanalytic` in .env, .env.example, 4 test files, instrumentation.ts, 2 backup files
- **React warning fixed:** DebugOverlay setState-during-render in LoginPage — moved trackLog to useEffect
- **Console.log cleanup:** Removed 588+ debug console statements from 67 client files (kept [TRACK] telemetry + ErrorBoundary)
- **Duplicate /stats route:** Verified — no actual conflict (6 independent /stats under different prefixes)
- **Audit report:** `.local/comprehensive-audit-report.md`

### Session Fixes (2026-04-01 — Continuation)
**Previous Agent work:**
- Added `credentials: 'include'` to 3 fetch calls: `use-monitoring.ts`, `main.tsx`, `input.tsx`
- Fixed route ordering in `notificationRoutes.ts`: `DELETE /bulk-delete-suspicious` registered before `DELETE /:id` (was causing Express to treat `bulk-delete-suspicious` as an ID)
- Fixed error response code in `notificationRoutes.ts`: 500 error block was returning `success: true` → corrected to `success: false`

**Current Agent work:**
- **Production console.log leak fixed (4 lib files):** Added `import.meta.env.DEV` guards to unprotected `console.log` statements that would run in production:
  - `queryClient.ts`: 1 instance (API request logging)
  - `api-client.ts`: 5 instances (request/response logging, token refresh logging)
  - `token-utils.ts`: 3 instances (also fixed security issue — was printing raw token values in logs; replaced with generic message)
  - `webauthn.ts`: 4 instances (biometric availability check logging)
- **Memory leak verification:** Confirmed all 15 `setInterval` usages and all event listeners have proper cleanup/`clearInterval` in React `useEffect` return functions — no leaks found
- **Auth verification:** Confirmed `requireAuth` middleware applied at router level in `workerRoutes.ts` (line 421) and `financialRoutes.ts` — all protected routes enforced correctly
- **Financial transaction integrity:** Verified all financial write operations use `withTransaction` wrapper — no unprotected financial mutations found
- **Daily Summaries Admin Page:** Added `/admin/daily-summaries` — admin-only page for managing `daily_expense_summaries` table. Features: filter by project via top-bar project selector, display summaries table (date, carried forward, income, wages, materials, transport, total expenses, balance), stats strip (total count, total income, total expenses, project count/last balance). Delete button (with confirmation dialog) deletes summaries for selected project or all projects + clears `summary_invalidations`. Rebuild button (with confirmation dialog) calls `SummaryRebuildService.rebuildProjectSummaries()` per project. Backend: `server/routes/modules/dailySummariesRoutes.ts` — GET/DELETE `/api/daily-summaries` + POST `/api/daily-summaries/rebuild`. Registered in `server/routes/modules/index.ts`. Sidebar entry under "الإدارة والأمان" section. Header pageInfo entry added.

### Remaining Phases (Planned)

**Phase 4 — Architecture (1-2 weeks):**
- Decompose `deployment-engine.ts` (5354 lines) into bounded contexts (orchestration/steps/monitoring/analytics)
- Decompose `smart-connection-manager.ts` (1105 lines) — separate failover, discovery, health
- Resolve duplicate route handlers: `workerRoutes` + `financialRoutes` both define PATCH/DELETE /worker-transfers/:id (documented in workerRoutes.ts line 1-16)
- Replace `setInterval` scheduling with proper job queue (bull/bullmq)
- Migrate `safe_numeric(text)` columns to proper `NUMERIC(15,2)` type

**Phase 5 — Long-term Scalability (1 month):**
- Deploy PgBouncer on remote DB server for connection pooling
- Implement DB read replica for reporting queries
- Automated backup restore verification (DR drills)
- Expand financial correctness test suite (property-based tests for settlement/allocation invariants)
- TLS certificate validation (`rejectUnauthorized: true`) with proper CA chain