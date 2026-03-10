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
- **Authentication & Security:** JWT-based authentication with separate access and refresh tokens, WebAuthn/FIDO2 for biometric login, rate limiting on sync endpoints, and fail-fast mechanisms for missing secrets or DB URLs in production.
- **AI Agent:** An AI agent processes messages via `/api/ai/chat`, leveraging `AIAgentService.processMessage()`. It includes `DatabaseActions.ts` for full CRUD, introspection, and analytics on whitelisted tables. Model fallback system (HuggingFace Llama 3.1 8B → Gemini 2.0 Flash → OpenAI GPT-4o) and intent detection are implemented. Write operations follow a PROPOSE → confirmation flow.
- **WhatsApp Integration:** Uses Baileys library for multi-user WhatsApp sessions. It features a multi-user architecture mapping user IDs to phone numbers, data isolation, and anti-ban protections like random delays, typing simulation, and daily message limits.
- **Project Permissions & Data Isolation:** A granular permission system (`ProjectAccessService.ts`) controls user access to projects and data. Middleware (`projectAccess.ts`, `auth.ts`) enforces these permissions, ensuring users only interact with authorized data. This includes filtering lists and checking access for CRUD operations across various modules.
- **Reporting System:** Professional report generation for daily, worker statements, and period-final reports. Data aggregation is handled by `ReportDataService.ts`. Reports are exportable to Excel (using ExcelJS) and PDF, with professional templates and RTL support.
- **Notifications:** A comprehensive notification system allows creation, reading, and deletion of notifications, with admin-only deletion and detailed monitoring statistics.
- **Data Integrity:** Addresses specific data integrity issues like NaN values in `total_pay` and empty timestamp strings, implementing NaN-safe aggregations and robust date parsing.

### Feature Specifications
- **Biometric Login:** WebAuthn/FIDO2 implementation with dedicated DB tables for credentials and challenges, and client-side utilities.
- **User Preferences:** Database-persisted user settings for various application preferences.
- **Admin AI Chat:** Admin-only access to an AI agent capable of complex database interactions and report generation.
- **WhatsApp Multi-User Support:** Allows multiple users to link their WhatsApp numbers and interact with the bot, with individual data isolation.
- **Comprehensive Project Access Control:** Users only see and manipulate data for projects they are explicitly authorized for, with admin roles having full access.
- **Professional Reports:** Generation of detailed financial and operational reports in Excel and PDF formats, with customizable date ranges and project filtering. Period Final report includes project fund transfers (ترحيل الأموال بين المشاريع) with incoming/outgoing tracking, and worker balance formula: `balance = totalEarned - (totalDirectPaid + totalTransfers)`. Balance formula: `(totalFundTransfers + totalProjectTransfersIn) - totalExpenses` where expenses include project transfers out.
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