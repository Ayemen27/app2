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
- **Database:** PostgreSQL with Drizzle ORM.
- **Route Architecture:** Single-authority routing via `server/routes/modules/index.ts` (`registerOrganizedRoutes`). All API routes live in organized modules (telemetryRoutes, notificationRoutes, healthRoutes, etc.). `server/routes.ts` contains only service initialization (Telegram, Google Drive) and HTTP server creation — zero route definitions. Global type declarations in `server/types/globals.d.ts`. Zero `as any` in production code (only `as typeof query` for Drizzle dynamic query builder limitations, all documented).
- **Authentication & Security:** JWT-based authentication with access/refresh tokens, WebAuthn/FIDO2 for biometric login, rate limiting, and robust logging sanitization. Offline login uses PBKDF2 hashing, generating offline credentials from plaintext passwords at online login. Canonical auth identity via `AuthUser` interface in `server/internal/auth-user.ts` with helpers: `getAuthUser()`, `requireAuthUser()`, `getAuthUserId()`, `isAdmin()`. Session revocation enforced in `authenticate` middleware. Centralized RBAC via `server/middleware/authz.ts` (`requireRoles()`, `requireAdmin()`). `requireRole('admin')` in `auth.ts` automatically includes `super_admin` — no role-check drift possible. All route files use typed auth access — no `(req as any).user` or email/admin fallbacks. Monitoring endpoints (`/api/monitoring/dashboard-stats`, `/api/monitoring/devices`, `/api/monitoring/alert`) are admin-only via router-level middleware. Notification stats (`/stats`, `/monitoring/stats`) require admin. Announcement creation requires admin (enforced in handler even for `POST /:type` parameterized route). Sync routes (`/api/sync/full-backup`, `/api/sync/instant-sync`, `/api/sync/verify-sync`, `/api/sync/stats`) are admin-only. Batch sync (`/api/sync/batch`) enforces per-operation project-level authorization via `ProjectAccessService` with server-side row ownership verification for UPDATE/DELETE operations. Auth regression test suite: 37 tests in `server/tests/auth-regression.test.ts`.
- **Offline System Architecture:** A world-class offline-first PWA design with a Service Worker for caching, `sync-leader.ts` for multi-tab leader election, `storage-recovery.ts` for quota management, and IndexedDB for extensive offline data storage. It includes crash recovery and idempotency for operations.
- **AI Agent:** Processes messages via `/api/ai/chat`, utilizing `DatabaseActions.ts` for CRUD, introspection, and analytics on whitelisted tables. It features a model fallback system (HuggingFace Llama 3.1 8B → Gemini 2.0 Flash → OpenAI GPT-4o) and intent detection. Write operations require user confirmation.
- **WhatsApp Integration:** Utilizes the Baileys library for multi-user WhatsApp sessions with full security isolation. Features `WhatsAppSecurityContext` with centralized `canPerformAction()` gateway for per-message user scoping, `allowedProjectIds` parameter on all DatabaseActions functions to enforce project-level data access, fail-closed whitelist (empty = reject all), and `whatsapp_security_events` audit logging. Admin-only AI commands (SQL_SELECT, SEARCH, LIST_TABLES, DESCRIBE_TABLE) are blocked for scoped users. All messages (incoming + outgoing) are logged with user_id and security_scope in whatsapp_messages table. Dashboard, global search, suppliers, equipment, and wells data are all filtered by project scope. Direct worker export via natural language with smart intent detection, format extraction, and automatic export without menu navigation. Multi-project worker support with full security scoping through `securityProjectIds` and `securityIsAdmin` stored in session context. **Arabic NLP:** `ArabicNormalizer.ts` handles hamza/taa/alef normalization, dialect mapping (Saudi/Gulf), and common typo correction. `SmartSuggestions.ts` provides context-aware suggestions filtered by permissions (canAdd/canRead). New intents: `worker_count`, `latest_expense`, `top_worker`. **Resilience:** Defensive `uncaughtException` handler catches Baileys crypto errors and auto-reconnects instead of crashing.
- **Project Permissions & Data Isolation:** A granular system using `ProjectAccessService.ts` and middleware enforces user access to projects and data. Non-admin users only see data they created or are authorized for, while admins have full access. Inter-project transfers are handled with specific logic to prevent double-counting in financial summaries.
- **Reporting System:** Generates professional daily, worker statement, and period-final reports, exportable to Excel and PDF with RTL support and a unified design system (`axion-export.ts`). Includes multi-project combined reports with detailed breakdowns and inter-project transfer tracking.
- **Notifications:** A comprehensive in-app notification system with creation, reading, and deletion capabilities, including admin-only deletion and monitoring statistics.
- **Data Integrity:** Implements robust handling for `NaN` values and empty timestamp strings, ensuring accurate aggregations and date parsing.

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