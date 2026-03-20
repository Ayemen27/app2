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
- **Deployment:** PM2 for process management. SSH supports dual auth: ed25519 key (`SSH_KEY_PATH`, auto-provisioned from `SSH_PRIVATE_KEY_B64`) with `BatchMode=yes StrictHostKeyChecking=yes`, or legacy `sshpass -e` fallback. Auth method auto-detected (`SSH_AUTH_METHOD=key|password|auto`). `known_hosts` provisioned from `SSH_KNOWN_HOSTS_B64` or live `ssh-keyscan`. Git push uses credential helper, no `--force`. Keystore secrets transferred via SCP to temp files (mode 600) — zero interpolation in shell commands. `apk.sh` archived to `scripts/legacy/apk.sh.bak`. Single entry point: `POST /api/deployment/start`. Legacy `/deploy` and `/history` endpoints removed. Docs updated (`ANDROID_BUILD_GUIDE.md`).
- **Deployment Engine Resilience:** Atomic concurrency control via DB transaction (check + insert in single tx, 409 on conflict). Build number generated inside tx to prevent race conditions. Step retry with configurable policy (network steps retry 2×, build steps fail fast). Log writes batched every 2s to reduce DB round-trips. APK download endpoint (`GET /api/deployment/download/:id`) validates file existence/size before streaming, sanitizes SSH params, kills child process on client disconnect.
- **Pre-Build Gate (prebuild-gate):** Mandatory pipeline step before any Android APK build. Tests all critical mobile API routes (health, auth, projects, workers, materials, etc.), verifies CORS for `capacitor://localhost` and `https://localhost` origins, validates SSL certificate (>7 days to expiry), validates CSP `connect-src` includes capacitor and localhost. **Infrastructure-aware:** Distinguishes 502/503/504/520-524 (infra failures) from app-level failures. Infra failures trigger auto-retry (up to 3 attempts with 15s delay). CORS/CSP checks are automatically skipped when server is unreachable (meaningless to check). If ALL route failures are infra-type and SSL is valid, build continues with warning instead of blocking. **Environment-aware:** Uses `resolveBaseUrl(config)` to select correct URL based on `config.environment` (production/staging). **Server readiness wait:** After PM2 restart, polls health endpoint for up to 90s before proceeding to gate. Config: `server/config/mobile-critical-routes.ts`. Engine: `server/services/prebuild-route-checker.ts`. Manual trigger: `POST /api/deployment/prebuild-check`.
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