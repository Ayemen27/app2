# Project: Professional AI Agent Workspace

## Overview
This Node.js application (rest-express) serves as a professional AI Agent Workspace, primarily focused on construction project management. It integrates WhatsApp for user interaction, features an advanced AI agent for database operations and queries, generates detailed reports, and implements a granular project permission system. The project aims to enhance decision-making through data analysis, streamline operations, and improve communication efficiency within construction projects by providing a comprehensive, AI-powered platform.

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
The system features a consistent design with a professional navy/blue palette, English numerals, and British DD/MM/YYYY date formats for reports. User preferences for language, dark mode, font size, and notifications are stored in a `user_preferences` table. Frontend pages include AI chat, WhatsApp setup, notification management, report generation (Daily, Worker Statement, Period Final, Multi-Project), and permission management.

### Technical Implementations
- **Core Technology:** Node.js with Express.js for the backend and Vite for the client.
- **Database:** PostgreSQL with Drizzle ORM. Multi-step financial mutations (attendance delete + ledger reversal, material purchase + equipment creation) wrapped in DB transactions via `withTransaction()` helper in `server/db.ts` and Drizzle's `db.transaction()`.
- **Route Architecture:** Single-authority routing via `server/routes/modules/index.ts` (`registerOrganizedRoutes`). All API routes live in organized modules (telemetryRoutes, notificationRoutes, healthRoutes, etc.). `server/routes.ts` contains only service initialization (Telegram, Google Drive) and HTTP server creation — zero route definitions. Global type declarations in `server/types/globals.d.ts`.
- **Authentication & Security:**
  - JWT-based authentication with access/refresh tokens (strict expiration enforcement — no `ignoreExpiration`), WebAuthn/FIDO2 for biometric login.
  - **Auth rate limiting:** Dedicated `authRateLimit` (5 attempts/15min per IP, `skipSuccessfulRequests: true`) applied to `/auth/login`, `/auth/refresh`, `/forgot-password`, `/reset-password`.
  - **Token hardening:** Access/refresh token cookies set `httpOnly: true`; refresh token removed from JSON response body (delivered only via httpOnly cookie).
  - **Mass-assignment protection:** All PATCH routes use strict field allowlists (`ALLOWED_WORKER_PATCH_FIELDS`, `ALLOWED_ATTENDANCE_PATCH_FIELDS`, `ALLOWED_TRANSFER_PATCH_FIELDS`, `ALLOWED_MISC_EXPENSE_PATCH_FIELDS`) via `pickAllowedFields()` — `project_id`, `id`, `created_at`, `created_by` are excluded from all allowlists.
  - **API response hardening:** Raw `error.message` replaced with generic messages in production via `safeErrorMessage()` in `server/middleware/api-response.ts`; consistent `{success, data?, message}` shape across all endpoints.
  - **SQL injection prevention:** `db-metrics.ts` validates table names against `information_schema.tables` before interpolation; uses `quoteIdentifier()` for safe quoting.
  - Canonical auth identity via `AuthUser` interface in `server/internal/auth-user.ts`. Session revocation enforced in `authenticate` middleware. Centralized RBAC via `server/middleware/authz.ts`. All route files use typed auth access.
  - CORS origin validation uses strict URL parsing via `new URL()` with `isStrictLocalhost()` and `isAllowedDomain()` helpers — applied consistently across HTTP middleware, OPTIONS handler, and Socket.IO.
  - Auth regression test suite: 37 tests. CORS regression suite: 27 tests. Security comprehensive suite: 27 tests.
- **WhatsApp Reconnect Safety:** Conflict (440) reconnect uses dual protection: per-attempt counter (max 3 consecutive) and sliding-window tracker (max 5 conflicts per 5 minutes) to permanently halt reconnect loops. **Process safety:** Exception handler targets Baileys-specific errors only (no `process.removeAllListeners`), non-Baileys errors propagate normally (no `process.exit`). **Memory safety:** `userMessageCounts` and `userMinuteRates` maps have TTL-based eviction (cleanup every 5 minutes, entries older than 1 hour evicted).
- **Offline System Architecture:** A world-class offline-first PWA design with a Service Worker for caching, `sync-leader.ts` for multi-tab leader election, `storage-recovery.ts` for quota management, and IndexedDB for extensive offline data storage. It includes crash recovery and idempotency for operations.
- **AI Agent:** Processes messages via `/api/ai/chat` (rate-limited: 20 req/60s per user), utilizing `DatabaseActions.ts` for CRUD, introspection, and analytics on whitelisted tables. Sensitive tables blocked from generic CRUD. Raw SQL execution restricted to SELECT-only. `getAllProjectsWithExpenses()` optimized from N+1 (5N queries) to 5 parallel aggregate queries using `Promise.all` + `Map` lookups.
- **WhatsApp Integration:** Baileys library for multi-user WhatsApp sessions with full security isolation. Features `WhatsAppSecurityContext` with centralized `canPerformAction()` gateway. **Arabic NLP:** `ArabicNormalizer.ts` handles hamza/taa/alef normalization, dialect mapping (Saudi/Gulf), and common typo correction. `SmartSuggestions.ts` provides context-aware suggestions filtered by permissions.
- **Project Permissions & Data Isolation:** A granular system using `ProjectAccessService.ts` and middleware enforces user access to projects and data. Non-admin users only see data they created or are authorized for, while admins have full access.
- **Reporting System:** Generates professional daily, worker statement, period-final, and attendance reports, exportable to Excel and PDF with RTL support. Attendance report (`ReportGenerator.generateAttendanceReport`) queries all workers' attendance for a project within a date range using parameterized SQL, produces JSON or Excel (with worker-level summaries and project-level totals), and supports `formatAsText` for WhatsApp/chat rendering.
- **Notifications:** A comprehensive in-app notification system with creation, reading, and deletion capabilities, including admin-only deletion and monitoring statistics.
- **Data Integrity:** Implements robust handling for `NaN` values and empty timestamp strings, ensuring accurate aggregations and date parsing. Financial operations use DB transactions for atomicity.

### Feature Specifications
- **Biometric Login:** WebAuthn/FIDO2 support for secure and convenient authentication.
- **User Preferences:** Database-persisted settings for customizable application behavior.
- **Admin AI Chat:** Exclusive access for administrators to an AI agent for advanced database interactions and report generation.
- **WhatsApp Multi-User Support:** Allows multiple users to link and manage their WhatsApp interactions with the bot independently.
- **Comprehensive Project Access Control:** Ensures users interact only with data from authorized projects, with administrators having overarching access.
- **Professional Reports:** Generation of detailed financial and operational reports in Excel and PDF, with customizable parameters and multi-project aggregation.
- **Real-time Notifications:** In-app notification system with varying priorities and types.

## External Dependencies
- **Monitoring:** OpenTelemetry and Sentry.
- **WhatsApp:** Baileys library.
- **Biometrics:** `@simplewebauthn/server` package.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **AI Models:** HuggingFace (Llama 3.1 8B), Gemini 2.0 Flash, OpenAI GPT-4o.
- **Reporting:** ExcelJS for Excel generation.
- **Deployment:** PM2 for process management. Custom Deployment & DevOps Console with SSE log streaming.
- **QR Code Generation:** `qrcode` package.
- **XSS Protection:** DOMPurify for sanitizing HTML in PDF generation.

## Architect Audit History
### Audit Round 1
- **T001 ✅** Auth rate limiting on login/refresh/reset + token hardening (httpOnly cookies, no refresh in body)
- **T002 ✅** RBAC mass-assignment fix with field allowlists on all PATCH routes
- **T003 ✅** DB transaction wrappers for financial operations (attendance delete, material purchase)
- **T004 ✅** WhatsApp process safety (no global handler override) + memory leak fix (TTL eviction)
- **T005 ✅** SQL injection fix in db-metrics + N+1 query optimization in DatabaseActions
- **T006 ✅** API response standardization (no error.message leakage, consistent shape)

### Audit Round 2
- **T001 ✅** Removed all duplicate route handlers (GET /users, PATCH/DELETE transfers, dashboard-kpis, reports/summary) + enforced admin on /users
- **T002 ✅** Socket.IO JWT auth middleware + scoped broadcasts (admin room for WhatsApp notifications, authenticated room for entity updates)
- **T003 ✅** Logout clears both accessToken + refreshToken cookies; centralized cookie config in `server/auth/cookie-config.ts`
- **T004 ✅** All pool.connect() wrapped in try/finally with guaranteed client.release() (db.ts + db-metrics.ts)
- **T005 ✅** Timing-safe comparisons (crypto.timingSafeEqual) for hash/token verification + token removed from email logs
- **T006 ✅** Graceful shutdown (SIGTERM+SIGINT) with full cleanup (HTTP, Socket.IO, WhatsApp, PDF browser, DB pool, intervals) + unhandledRejection handler
- **T007 ✅** 9 composite database indexes added for hot query patterns (attendance, transfers, purchases, expenses)
- **T008 ✅** PATCH validation for tasks (Zod schema) + user role enum validation + field allowlists on remaining routes

### Audit Round 3
- **T001 ✅** Sync batch authz (admin-only for global tables: project_types/autocomplete) + batch size cap (200) + activity limit cap (100)
- **T002 ✅** Well CRUD write-level authorization (add/edit/delete permission checks on all 6 write routes)
- **T003 ✅** Well expense validation (amount>0, no future dates) + cross-project linkage prevention in WellExpenseService
- **T004 ✅** Record transfer row locking (SELECT FOR UPDATE) + rowcount verification + ledger reversal atomicity (transactional) + admin/editor auth on reconcile/reverse
- **T005 ✅** Equipment enum validation (type/status/condition) + transactional delete (movements + equipment atomic)
- **T006 ✅** HSTS header (production) + CSP unsafe-eval removed + backup endpoints rate-limited (download/analyze/test-connection/logs/status)

### Audit Round 4
- **T001 ✅** Token migration: Platform-aware `auth-token-store.ts` (cookies for web, localStorage for native/Capacitor). `cookie-parser` registered. All 20+ client files migrated to centralized token store. Zero direct `localStorage.getItem('accessToken')` outside store.
- **T002 ✅** Auth transport hardening: `isNativeClient()` requires UA match (not just header). Login/refresh responses strip tokens from JSON body for web clients. Cookies handle web auth. `AuthProvider.tsx` updated with `isWebCookieMode()` check.
- **T003 ✅** Error message sanitization: `api-error-normalizer.ts` middleware wraps `res.json()` on `/api` path. All 8 route files (113 instances) replaced raw `error.message` with `safeErrorMessage()`. Defense-in-depth: middleware + route-level sanitization.
- **T004 ✅** Auth routes conditional token delivery: `tokenDelivery: 'bearer'|'cookie'` field. Socket.IO cookie-based auth fallback. Dead code cleanup (`getAuthToken` removed from `axion-reports.tsx`).

### Audit Round 5 — Session Security Hardening
- **T001 ✅** Client context extraction: `server/auth/client-context.ts` — `extractClientContext(req)` returns `{deviceId, platform, ip, ipRange, userAgent, appVersion, browserName, osName, deviceType, deviceHash}`. `validateSessionBinding()` compares stored vs current context (block/step-up/allow).
- **T002 ✅** Session binding at login: `generateTokenPair` now persists full device context (deviceId, deviceFingerprint, userAgent, ipAddress, osName, browserName, deviceType, securityFlags with platform/ipRange/appVersion). Static `deviceId: 'mobile-diagnostic'` replaced with `extractClientContext(req)`. WebAuthn routes also updated.
- **T003 ✅** Session verification with device binding: `verifySession` in auth.ts now validates client context against stored session. Platform mismatch → block (403). Device hash mismatch on strict routes → step-up required. IP range change on relaxed routes → warning logged. Endpoint risk classification via `getBindingPolicy()`.
- **T004 ✅** Session lifecycle fix: Logout now calls `revokeToken(sessionId, 'logout')` before clearing cookies. Fixed `revokeAllUserSessions` bug (`ne(deviceId)` → `ne(sessionToken)`). Session status tracked in securityFlags (active/revoked).
- **T005 ✅** Refresh token rotation: Dev mode now generates new sessionId on every refresh (was reusing). Detects refresh token reuse → revokes all user sessions (theft indicator). Session context updated on refresh. Both dev/prod modes unified with reuse detection.
- **T006 ✅** Replay protection: `auth_request_nonces` table + `requireFreshRequest({windowSec})` middleware. Applied to: `/auth/refresh` (120s), password reset (60s), role changes (60s), all financial write operations (60s). Periodic nonce cleanup via `startNonceCleanup()`.

### Round 6 — Well Management System Enhancement
- **T001 ✅** Schema expansion: 4 new tables (`well_work_crews`, `well_solar_components`, `well_transport_details`, `well_receptions`) + `beneficiary_phone` column on wells. Safe SQL migration via `server/db/run-well-expansion-migrations.ts` (auto-runs at startup). DB: 79 tables.
- **T002 ✅** WellService.ts field name fixes: `assignedTo→assignedWorkerId`, removed `isAccounted` dependency (LEFT JOIN pattern), `wellTaskId→taskId`, `accountantId→accountedBy`, `paymentType→paymentMethod`, `newValue/previousValue→newData/previousData`, added `entityType+entityId` to all audit log inserts, auto-computed `taskOrder`.
- **T003 ✅** WellExpenseService.ts: NULL violation fixes (safe defaults for quantity/unit/unitPrice), referenceId kept as string, createdBy accepts real userId (no hardcoded 'system'), transport expenses properly handled.
- **T004 ✅** Frontend API path fixes: All `/wells?...` → `/api/wells?...` in well-accounting.tsx, well-cost-report.tsx, well-detail-card.tsx. Fixed apiRequest DELETE call signature.
- **T005 ✅** New CRUD endpoints: `/api/wells/:wellId/crews|solar-components|transport|receptions` with Zod validation, project access control, and cost report integration.
- **T006 ✅** New RTL Arabic well lifecycle forms component (`client/src/components/well-lifecycle-forms.tsx`): 4 tabbed sections (crews/solar/transport/reception) with full CRUD, Arabic labels matching Excel columns, data-testid attributes.
- **Post-review fixes**: Added missing imports for new tables in WellService.ts, fixed Zod `error.errors→error.issues`, fixed WellExpenseService filter bug (chained `.where()` → combined `and()` to prevent well_id bypass).

### Round 7 — Wells Page Professional Upgrade
- **T001 ✅** Fixed NaN% bug in avgCompletion (Number() + Number.isFinite() + zero-guard). Added summary stats from `/api/wells/summary/:project_id` (total crews, transport, reception status).
- **T002 ✅** Added Tasks tab (CRUD + status transitions) and Accounting tab (task accounting via POST /api/wells/tasks/:taskId/account) to well-lifecycle-forms.tsx. Expanded to 6 tabs with progress bar.
- **T003 ✅** Edit functionality added to crews/transport/receptions sections (PUT APIs) with inline form editing.
- **T004 ✅** PDF export (jspdf) + enhanced Excel export with additional columns (fan type, pump power, water level).
- **Post-review fixes**: Fixed progress field mismatch (`percentage` → `completionPercentage`), fixed accounting API contract (`actualCost` → `amount`, `notes` → `description`), fixed accounting filter (`status === 'accounted'` → `isAccounted`), added `checkProjectAccess('edit')` to all 3 PUT endpoints (crews/transport/receptions). DB migration: added `crew_entitlements` and `transport_date` columns to `well_transport_details`.

### Known Recommendations (Deferred)
- **Play Integrity (Android)**: Phase 1 of attestation plan — replace UA heuristics with cryptographic device verification. Requires Google Play Console setup.
- **iOS App Attest**: Deferred until iOS client reaches production.
- **SIEM/KMS/HSM**: Deferred until compliance requirements or incident volume justify.
- **CI guard for error leakage**: Add grep-based CI test to fail if `res.json({error: error.message})` appears in route handlers.
