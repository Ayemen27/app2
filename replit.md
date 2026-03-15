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

### Feature Specifications
- **Biometric Login:** WebAuthn/FIDO2 for secure authentication.
- **User Preferences:** Database-persisted settings for customizable application behavior.
- **Admin AI Chat:** Exclusive access for administrators to an AI agent for advanced database interactions.
- **WhatsApp Multi-User Support:** Allows multiple users to manage WhatsApp interactions independently.
- **Comprehensive Project Access Control:** Ensures users interact only with authorized project data.
- **Professional Reports:** Generation of detailed financial and operational reports in Excel and PDF.
- **Real-time Notifications:** In-app notification system with varying priorities.

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