# Project: Professional AI Agent Workspace

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
- **WhatsApp Integration:** Utilizes the Baileys library for multi-user sessions with security isolation. Features Arabic NLP for normalization, dialect mapping, typo correction, and context-aware suggestions. A multi-phase AI-powered pipeline converts WhatsApp conversations into structured financial entries with mandatory human approval. The pipeline uses AI models (via AIExtractionOrchestrator.ts and ModelManager.ts) for: name extraction (person/company identification from conversation context), financial transaction analysis (type, amount, sender, recipient), image/document analysis (transfer receipts, invoices via OCR + AI), project inference, and confidence scoring with reasons. All AI services have regex fallback when AI models are unavailable. Pipeline stages: ingest → extract_names (AI) → user_links_names → analyze_financially (AI) → reconcile → auto-link → verify → post.
- **AI Enhancements (Latest):** AI prompts upgraded with few-shot examples (3-5 per function) covering Yemeni dialect edge cases, compound messages, and false positives. Zod schema validation enforces structured output from AI models before database insertion. AIMetricsService tracks AI hit-rate, fallback-rate, latency, and confidence distribution per batch (GET /api/wa-import/batch/:id/metrics). AutoLinkingService auto-links extracted names/transactions to existing workers/suppliers/projects with confidence scores, displayed in a dedicated verification UI tab with color-coded confidence badges (green >85%, yellow 60-85%, red <60%), individual accept/reject, and bulk approve for high-confidence links (>90%). **Multi-key rotation system:** Each provider supports multiple API keys (DEEPSEEK_API_KEYS, OPENAI_API_KEYS, GEMINI_API_KEYS, HUGGINGFACE_API_KEYS as comma-separated). When one key hits rate limits (429/402), the system automatically rotates to the next available key before falling back to the next provider. Provider priority: DeepSeek(7keys) → HuggingFace(6keys) → Gemini(7keys) → OpenAI(7keys) = 27 total keys. Keys auto-recover after 5 minutes. GET /api/wa-import/ai-status returns live model availability with per-provider key counts. Extraction supports resume mode — re-running on a batch with existing candidates skips already-processed messages instead of blocking.
- **Project Permissions & Data Isolation:** A granular system enforces user access to projects and data, ensuring non-admin users only view authorized information.
- **Reporting System:** Generates professional daily, worker statement, period-final, multi-project-final, and project-comprehensive reports. Reports are exportable to Excel and PDF with RTL support, aggregating key project metrics like workforce, wells, attendance, expenses, cash custody, and equipment with KPIs. Supplier payments are included in period final and comprehensive reports. **Unified Worker Balance Formula:** `remaining = earned(actualWage) - paidCash(paidAmount) - transfers(non-settlement) - settlements(from_project only, direction-aware) + rebalanceDelta`. This formula is consistently applied across worker card stats, worker statement PDF, and project comprehensive report. Settlement transfers (`transfer_method='settlement'`) are excluded from regular transfers to prevent double-counting with `worker_settlement_lines`. **Settlement direction fix (2026-03-31):** Comprehensive report now only counts settlements where `from_project_id` matches the current project (outgoing settlements). Previously `(from_project_id OR to_project_id)` caused double-counting. Worker statement now correctly distinguishes debit vs credit based on settlement direction. A dedicated "التسويات" (Settlements) column was added to comprehensive report PDF, Excel, and web UI. **Project balance fix (2026-03-31):** Comprehensive report `project_fund_transfers` queries (both incoming and outgoing) now exclude `transfer_reason='legacy_worker_rebalance'` to match `ExpenseLedgerService` logic. Previously, rebalance transfers were included in the report but excluded from the projects page, causing artificial balance discrepancies (e.g., -117,248 deficit that didn't exist). **Settlement preview rebalance fix (2026-03-31):** `calculatePreviewData` in `settlementRoutes.ts` now includes `rebalanceDelta` (from `legacy_worker_rebalance` project_fund_transfers) in worker balance calculation for settlement eligibility. Formula: `balance = earned - paid - transferred(non-settlement) - settled(from_project) + rebalanceDelta`.
- **Notifications:** Comprehensive in-app notification system with local notifications for Android via Capacitor.
- **Offline Capabilities:** Offline-first PWA design using Service Worker for caching and IndexedDB for extensive offline data storage, including crash recovery.
- **Data Integrity & Financial System:** Robust handling of `NaN` values and empty timestamp strings. Critical fixes ensure double-entry accounting principles, with a `FinancialIntegrityService` for worker balance synchronization, audit logging, and reconciliation. Financial guards prevent overpayments and enforce material purchase integrity. All financial calculations consistently use `actual_wage` and `safe_numeric` for numerical precision. DB triggers invalidate summaries, and foreign key constraints enforce referential integrity.
- **Deployment Engine:** Features a robust deployment pipeline system supporting web and Android builds. Includes security hardening (path/command injection prevention), atomic locks for concurrency, fail-closed startup, comprehensive health checks, server cleanup, build-server self-healing, pre-build and Android readiness gates, post-deploy verification, hotfix guards, and Telegram notifications. Supports advanced rollback and resume-from-step functionalities. Integrates with a structured deployment logger and a pipeline-as-code configuration. Implements RBAC and an approval system for deployments, along with daily deployment limits. Enhanced SSH security with key-based authentication enforced for production.

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