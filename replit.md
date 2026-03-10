# Project: Professional AI Agent Workspace

## Overview
This project is a Node.js application (rest-express v1.0.29) designed as a professional AI Agent Workspace. Its core purpose is to provide a comprehensive platform for construction project management, integrating various communication channels, robust data management, and AI-powered assistance. Key capabilities include WhatsApp integration for user interaction, a sophisticated AI agent for database queries and operations, detailed reporting features, and a granular project permission system for data isolation. The application aims to streamline operations, enhance decision-making through data analysis, and improve communication efficiency within construction projects.

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
- Settings page preferences are stored in the PostgreSQL `user_preferences` table, allowing user customization of language, dark mode, font size, and notification settings.
- Reports utilize a shared design system with a professional navy/blue palette, English numerals, and British DD/MM/YYYY date formats for consistency across Excel and PDF exports.
- Frontend includes pages for AI chat, WhatsApp setup, notification management, report generation (Daily, Worker Statement, Period Final), and permission management.

### Technical Implementations
- **Core Technology:** Node.js with Express.js for the backend, Vite for the client-side build.
- **Database:** PostgreSQL with Drizzle ORM, connected via `DATABASE_URL_CENTRAL`.
- **Authentication & Security:** JWT-based authentication with separate access and refresh tokens, WebAuthn/FIDO2 for biometric login, rate limiting on sync endpoints, fail-fast mechanisms for missing secrets or DB URLs in production. Offline login restricted to server errors (500/503) or network failures only, requiring SHA-256 password hash verification via `crypto-utils.ts`. Sensitive data (passwords, tokens, secrets) are redacted from server logs via `sanitizeLogData()`. Auth mode is reset to 'online' on logout to prevent stale offline state.
- **AI Agent:** An AI agent processes messages via `/api/ai/chat`, leveraging `AIAgentService.processMessage()`. It includes `DatabaseActions.ts` for full CRUD, introspection, and analytics on whitelisted tables. Model fallback system (HuggingFace Llama 3.1 8B → Gemini 2.0 Flash → OpenAI GPT-4o) and intent detection are implemented. Write operations follow a PROPOSE → confirmation flow.
- **WhatsApp Integration:** Uses Baileys library for multi-user WhatsApp sessions. It features a multi-user architecture mapping user IDs to phone numbers, data isolation, and anti-ban protections like random delays, typing simulation, and daily message limits.
- **Project Permissions & Data Isolation:** A granular permission system (`ProjectAccessService.ts`) controls user access to projects and data. Middleware (`projectAccess.ts`, `auth.ts`) enforces these permissions, ensuring users only interact with authorized data. This includes filtering lists and checking access for CRUD operations across various modules. Worker routes apply `requireAuth` and `attachAccessibleProjects` at the router level. The `checkProjectAccess` function in `workerRoutes.ts` allows access when `project_id` is null/undefined (resource not tied to a specific project), and only enforces project-level checks when a specific `project_id` is provided. The frontend passes `selectedProjectId` from the project selector to `AddWorkerForm` and Dashboard worker-add form to include `project_id` in POST requests.
- **Reporting System:** Professional report generation for daily, worker statements, and period-final reports. Data aggregation is handled by `ReportDataService.ts`. Reports are exportable to Excel (using ExcelJS) and PDF, with professional templates and RTL support.
- **Unified Export System:** All pages use `createProfessionalReport()` from `client/src/utils/axion-export.ts` for Excel exports with consistent navy/blue branding (`#1B2A4A`, `#2E5090`), RTL Arabic support, numeric formatting via `numFmt`, signature blocks, and system footers. Pages with exports: transport, worker-accounts, supplier-accounts, material-purchases, transactions, activities, equipment, worker-attendance, worker-misc-expenses, project-fund-custody, project-transfers, projects, wells, well-accounting, suppliers-professional.
- **Notifications:** A comprehensive notification system allows creation, reading, and deletion of notifications, with admin-only deletion and detailed monitoring statistics.
- **Data Integrity:** Addresses specific data integrity issues like NaN values in `total_pay` and empty timestamp strings, implementing NaN-safe aggregations and robust date parsing.

### Feature Specifications
- **Biometric Login:** WebAuthn/FIDO2 implementation with dedicated DB tables for credentials and challenges, and client-side utilities.
- **User Preferences:** Database-persisted user settings for various application preferences.
- **Admin AI Chat:** Admin-only access to an AI agent capable of complex database interactions and report generation.
- **WhatsApp Multi-User Support:** Allows multiple users to link their WhatsApp numbers and interact with the bot, with individual data isolation.
- **Comprehensive Project Access Control:** Users only see and manipulate data for projects they are explicitly authorized for, with admin roles having full access.
- **Professional Reports:** Generation of detailed financial and operational reports in Excel and PDF formats, with customizable date ranges and project filtering. PDF export opens styled HTML with a print bar for browser-native PDF save. Period Final report includes project fund transfers (ترحيل الأموال بين المشاريع) with incoming/outgoing tracking. Worker Statement shows cross-project data by default with professional project summary (per-project days/earnings/balance + totals). Worker balance: `balance = totalEarned - (totalDirectPaid + totalTransfers)`. Project balance: `(totalFundTransfers + totalProjectTransfersIn) - totalExpenses`.
- **Real-time Notifications:** In-app notification system with different types and priorities.

## External Dependencies
- **Monitoring:** OpenTelemetry and Sentry.
- **WhatsApp:** Baileys library.
- **Biometrics:** `@simplewebauthn/server` package.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **AI Models:** HuggingFace (Llama 3.1 8B), Gemini 2.0 Flash, OpenAI GPT-4o.
- **Reporting:** ExcelJS for Excel generation.
- **Deployment:** PM2 for process management, SSH for deployment.
- **QR Code Generation:** `qrcode` package.