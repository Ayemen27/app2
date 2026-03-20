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
- **Authentication & Security:** JWT-based authentication with access/refresh tokens, WebAuthn/FIDO2 for biometric login, robust rate limiting, token hardening (httpOnly cookies), mass-assignment protection via field allowlists, API response hardening, SQL injection prevention, canonical auth identity, centralized RBAC, and strict CORS origin validation. Session security includes client context extraction, session binding, device binding verification, refresh token rotation, and replay protection. Admin-only enforcement is applied to sensitive operations.
- **AI Agent:** Processes messages for database CRUD, introspection, and analytics on whitelisted tables, restricting raw SQL execution to SELECT-only. It includes query optimizations and enhanced well management integration with specific ACTION commands. Arabic intent detection patterns are supported for natural language queries.
- **WhatsApp Integration:** Uses the Baileys library for multi-user sessions with security isolation, featuring Arabic NLP for normalization, dialect mapping, typo correction, and context-aware smart suggestions.
- **Project Permissions & Data Isolation:** A granular system enforces user access to projects and data, ensuring non-admin users only view authorized information.
- **Reporting System:** Generates professional daily, worker statement, period-final, and attendance reports, exportable to Excel and PDF with RTL support. Well management reports include comprehensive multi-sheet Excel and print-ready HTML/PDF.
- **Notifications:** A comprehensive in-app notification system allows for creation, reading, and deletion.
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
- **Deployment:** PM2 for process management. SSH uses `sshpass -e` (env var `SSHPASS`) with `StrictHostKeyChecking=accept-new`. Git push uses credential helper instead of token-in-URL. Keystore secrets written to temp files (umask 077) on remote — never interpolated in commands. `apk.sh` archived to `scripts/legacy/apk.sh.bak`. `/deploy` redirects 307 to `/start`.
- **Deployment Engine Resilience:** Concurrency control prevents parallel deployments (409 on conflict). Step retry with configurable policy (network steps retry 2×, build steps fail fast). Log writes batched every 2s to reduce DB round-trips. APK download endpoint streams via SSH (`GET /api/deployment/download/:id`).
- **App Update System:** `appUpdateChecker.ts` checks for updates every 4 hours with idempotent resume listener, dismiss per versionCode, and force-update support.
- **Notification Permissions:** `notificationPermission.ts` implements Android 13+ POST_NOTIFICATIONS state machine.
- **Process Management:** Deployment engine uses `detached: true` process groups and `process.kill(-pgid)` for clean process tree termination on cancel.
- **QR Code Generation:** `qrcode` package.
- **XSS Protection:** DOMPurify for sanitizing HTML in PDF generation.