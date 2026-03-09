# Project: Professional AI Agent Workspace

## Rules of Engagement (Arabic)
- **Analytical Thinking:** Step-by-step analysis before answering.
- **Honesty:** Explicitly state when something is unknown.
- **Innovation:** Propose non-traditional solutions if common ones fail.
- **Realism:** Choose the most practical and implementable solution.
- **Transparency:** Clarify assumptions before building on them.
- **No Flattery:** Present reality as it is, even if uncomfortable.
- **No Rushing:** Evaluate options before committing.

## System Directives (Adopted March 2026)
1. **Decision Rule:** If solution is uncertain -> specify uncertainty percentage.
2. **Information Rule:** If info is missing -> request it clearly.
3. **Selection Rule:** If multiple solutions -> choose the best and explain why.
4. **No Deception:** Do not try to please the user at the expense of truth.
5. **Out of the Box:** Short traditional solution -> Smart alternative -> Unconventional (if logical).

## Current State
- Node.js project (rest-express v1.0.29).
- WhatsApp integration (Baileys) via `WhatsAppBot.ts`.
- Telegram and Google Drive services integrated.
- OpenTelemetry and Sentry monitoring active.
- Database: PostgreSQL (external server via `DATABASE_URL_CENTRAL`), Drizzle ORM.
- Deployed to external server at 93.127.142.144 via SSH/PM2.

## Security Audit (March 2026)
- JWT uses separate secrets: `JWT_ACCESS_SECRET` (access tokens) and `JWT_REFRESH_SECRET` (refresh tokens)
- No hardcoded JWT secrets - fail-fast in production if secrets missing
- Client-side token validation includes expiry checking with 30-second proactive refresh
- Sync endpoints protected with authentication and rate limiting (100 req/15min)
- Database connection fails fast in production if URL missing
- Sync table definitions centralized in `shared/schema.ts` (SYNCABLE_TABLES constant)

## Biometric/Fingerprint Login (WebAuthn)
- WebAuthn/FIDO2 implemented for biometric login on mobile
- DB tables: `webauthn_credentials` (stores public keys), `webauthn_challenges` (temporary challenges)
- API endpoints: `/api/webauthn/register/options`, `/api/webauthn/register/verify`, `/api/webauthn/login/options`, `/api/webauthn/login/verify`
- Client utility: `client/src/lib/webauthn.ts`
- After first successful password login, user is prompted to register fingerprint
- Fingerprint button on LoginPage triggers biometric authentication
- Uses `@simplewebauthn/server` package

## User Preferences (DB-Persisted Settings)
- All Settings page preferences stored in PostgreSQL `user_preferences` table
- DB columns: language, auto_update, dark_mode, font_size, push_notifications, expense_alerts, attendance_alerts, app_lock
- API: `GET /api/preferences` (loads or creates defaults), `PUT /api/preferences` (Zod-validated update)
- Route file: `server/routes/modules/preferencesRoutes.ts`
- Frontend: `client/src/pages/settings.tsx` loads from API, saves on explicit "Save" button
- Table has FK to `users(id)` with CASCADE delete, unique per user

## AI Agent (Admin Chat)
- Route: `/api/ai/chat` calls `AIAgentService.processMessage()` (fixed from broken python subprocess)
- Backend: `server/services/ai-agent/AIAgentService.ts` — system prompt with ACTION/PROPOSE commands
- DB actions: `server/services/ai-agent/DatabaseActions.ts` — full CRUD + introspection + analytics
  - `listAllTables()`, `describeTable()`, `searchInTable()`, `insertIntoTable()`, `updateInTable()`, `deleteFromTable()`, `executeRawSelect()`
  - `getDashboardSummary()`, `getBudgetAnalysis()`, `getTopWorkers()`, `getWorkersUnpaidBalances()`, `getProjectComparison()`, `getRecentActivities()`, `getMonthlyTrends()`
  - `getSuppliersList()`, `getSupplierStatement()`, `getWorkerStatement()`, `getEquipmentList()`, `getWellsList()`, `globalSearch()`
  - All table/column names validated against pg_tables whitelist; parameterized queries
  - `executeRawSelect` has 10s timeout, LIMIT 500 cap, forbidden keyword rejection
  - All SUM queries use NaN-safe CASE expressions to handle corrupt data
- Write operations use PROPOSE → confirmation flow (operationId `op_xxx`) → executeApprovedOperation
- Frontend: `client/src/pages/ai-chat.tsx` — inline execute/cancel buttons for pending ops, data table rendering
- Admin-only access via `requireAdmin` middleware
- Model Manager: HuggingFace (Llama 3.1 8B) → Gemini 2.0 Flash → OpenAI GPT-4o with automatic fallback
- Intent Detection: Fallback system detects user intent from Arabic text when LLM doesn't produce ACTION format
- ACTION Format Normalization: regex auto-fixes `ACTION:X` → `[ACTION:X]` for inconsistent LLM output
- Report Generator: `server/services/ai-agent/ReportGenerator.ts` — Excel/PDF export with ExcelJS
- Schema note: `workers.is_active` (snake_case), `materialPurchases.materialName`, `workerAttendance.totalPay` may contain NaN values

## Data Integrity Fixes (March 2026)
- **NaN in total_pay:** Worker attendance `total_pay` contains NaN values — all SUM queries in DatabaseActions.ts use NaN-safe CASE expressions
- **Empty timestamp strings:** `fund_transfers.transfer_date`, `worker_transfers.transfer_date` contain empty strings `""` that crash PostgreSQL timestamp parsing. Fixed with `CAST(col AS TEXT)` pattern before comparisons in `projectRoutes.ts`:
  - `safeDateFilter()` for Drizzle ORM queries
  - `overallSumsQuery` raw SQL aggregation
  - `calculateCumulativeBalance()` all date range comparisons
- **Pattern:** Always use `CAST(transfer_date AS TEXT) != '' AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'` before any `::date` cast

## Notification System (March 2026)
- **Service:** `server/services/NotificationService.ts` — create, read, delete, stats
- **Routes:** `server/routes/modules/notificationRoutes.ts` mounted at `/api/notifications`
- **Pages:** `/notifications` (user view), `/admin-notifications` (admin monitoring dashboard)
- **Recipients column:** Text type (not array) — use `LIKE` for matching, admin sees all notifications
- **Security:** Delete restricted to admin role only (403 for non-admin)
- **Stats endpoint:** `GET /api/notifications/monitoring/stats` returns total, unread, critical, byType, byPriority, userStats
- **Mark as read:** `POST /api/notifications/:id/read` and `POST /api/notifications/:id/mark-read` (alias)
- **Test endpoint:** `POST /api/notifications/test/create` (admin only, creates test notifications)
- **Notification types:** system, security, maintenance, task, announcement, payroll, safety

## WhatsApp Integration (March 2026)
- **Bot:** `server/services/ai-agent/WhatsAppBot.ts` — Baileys library, multi-auth session
- **Routes:** `server/routes/modules/whatsappAIRoutes.ts` at `/api/whatsapp-ai` (all require auth)
- **Page:** `/whatsapp-setup` — 5 tabs: My Link, Bot, Users, Protection, Stats
- **Multi-User Architecture (March 2026):**
  - Table `whatsapp_user_links`: maps user_id → phone_number (unique per user)
  - Each user registers their WhatsApp phone from "ربط رقمي" tab
  - Bot identifies sender by phone lookup → resolves user_id
  - Data isolation: user sees only their projects (via `user_project_permissions` + `projects.engineerId`)
  - Admin sees all projects; regular users only see assigned projects
  - Unregistered phones get rejection message
  - Commands: "مشاريعي", "مساعدة", "5000 مصاريف اسم_العامل", "إلغاء"
- **Anti-Ban Protections:**
  - Random delay 2-5s before each reply
  - Typing presence simulation (composing → paused)
  - Zero-width character suffix (multiple random chars)
  - Daily message limit (50 max)
  - Exponential backoff reconnection with jitter
  - Browser mimicry (Chrome 121)
  - markOnlineOnConnect: false, generateHighQualityLinkPreview: false
- **QR Generation:** Server-side via `qrcode` package at `/api/whatsapp-ai/qr-image` (admin only)
- **Endpoints:** GET /status, POST /restart (admin), POST /disconnect (admin), GET /my-link, POST /link-phone, POST /unlink-phone, GET /all-links (admin), DELETE /admin-unlink/:userId (admin), GET /qr-image (admin)

## Project Permission & Data Isolation System (March 2026)
- **Service:** `server/services/ProjectAccessService.ts` — core permission engine
  - `isAdmin()`, `getAccessibleProjectIds()`, `checkProjectAccess()`, `grantPermission()`, `revokePermission()`, `updatePermission()`
  - Bypass: admin/super_admin roles → full access; engineerId match → owner access
- **Middleware:** `server/middleware/projectAccess.ts`
  - `attachAccessibleProjects` — loads `req.accessibleProjectIds` for list filtering
  - `requireProjectAccess(action)` — enforces per-project access on PATCH/DELETE routes
- **DB Table:** `user_project_permissions` — columns: userId, projectId, canView, canAdd, canEdit, canDelete, assignedBy, assignedAt
- **DB Table:** `permission_audit_logs` — tracks all grant/revoke/update actions with actor, target, old/new permissions
- **Data Isolation:** All list endpoints filter by `accessibleProjectIds` using `inArray()`:
  - `projectRoutes.ts` (GET /, /with-stats, /all-projects-expenses, PATCH /:id, DELETE /:id)
  - `workerRoutes.ts`, `wellRoutes.ts`, `equipmentRoutes.ts`, `financialRoutes.ts`
- **Admin API:** `server/routes/modules/permissionRoutes.ts` mounted at `/api/permissions`
  - GET /my, /project/:id, /user/:id, /audit-logs
  - POST /grant, PATCH /update, DELETE /revoke
- **Frontend Hook:** `client/src/hooks/useProjectPermissions.ts` — canViewProject, canEditProject, canDeleteFromProject, getPermissionLevel
- **Admin Page:** `client/src/pages/permission-management.tsx` — project selector, user list with badges, grant/revoke/update dialogs, audit log viewer
- **Route:** `/admin/permissions` in App.tsx, "إدارة الصلاحيات" in sidebar
- **AdminRoute Fix:** `AdminRoute.tsx` now accepts both `admin` and `super_admin` roles

## Deployment
- SSH: `sshpass -e` with host `93.127.142.144`, user `administrator`
- App location: `~/app2`, PM2 process: `construction-app`, port 6000
- Build: `npm run build` (client via Vite + server via esbuild)
- Deploy pattern: Edit locally → SCP files → `npm run build` on remote → `pm2 restart construction-app`
