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
- **AI Agent:** Processes natural language messages for database CRUD, introspection, and analytics on whitelisted tables, restricting raw SQL execution to SELECT-only queries. It includes query optimizations and specific ACTION commands for well management. Arabic intent detection is supported.
- **WhatsApp Integration:** Utilizes the Baileys library for multi-user sessions with security isolation. Features Arabic NLP for normalization, dialect mapping, typo correction, and context-aware suggestions. A multi-phase pipeline converts WhatsApp conversations into structured financial entries with mandatory human approval. This pipeline includes name extraction, entity linking, financial extraction, deduplication, matching, reconciliation, and a review dashboard.
- **Project Permissions & Data Isolation:** A granular system enforces user access to projects and data, ensuring non-admin users only view authorized information.
- **Reporting System:** Generates professional daily, worker statement, period-final, multi-project-final, and project-comprehensive reports. Reports are exportable to Excel and PDF with RTL support, aggregating key project metrics like workforce, wells, attendance, expenses, cash custody, and equipment with KPIs. Supplier payments are included in period final and comprehensive reports.
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