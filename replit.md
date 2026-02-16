# AXION - نظام إدارة مشاريع المقاولات

### Overview
AXION is a comprehensive project management system for contracting businesses. It aims to streamline operations, enhance financial tracking, and improve overall project efficiency. The system covers authentication, project management, workforce administration, supplier and procurement management, well management, simplified equipment tracking, unified notifications, AI-powered interactions, robust backup solutions, integrated reporting, and a double-entry ledger system.

### User Preferences
- اللغة: العربية فقط - لا يفهم الإنجليزية
- النهج: احترافي مع مراجعة معمارية
- الأولوية: التنظيف والدمج قبل إضافة ميزات جديدة
- **Critical Rule**: All responses should be in Arabic only.
- **Critical Rule**: Do not use raw `<textarea>` or `<input>` for text input. Always use `Textarea` and `Input` components from `@/components/ui`. Any input field not supporting auto-height or showing a scrollbar before max-height is a bug. All input fields must have consistent behavior.
- **Critical Rule**: For React Query, use `QUERY_KEYS.xxx` or `QUERY_KEYS.xxx(param)` from `client/src/constants/queryKeys.ts`. Do not use direct string query keys. Invalidate cache only with specific query keys, e.g., `invalidateQueries({ queryKey: QUERY_KEYS.specific, refetchType: 'active' })`. Never use `invalidateQueries()` without a specific `queryKey`.

### System Architecture
The system is built as a full-stack JavaScript application using:
- **Frontend**: Vite, React, shadcn/ui, TailwindCSS. UI components are standardized using `shadcn/ui`.
- **Backend**: Express.js, Socket.IO.
- **Database**: PostgreSQL with Drizzle ORM.
- **Shared**: Data models and types are defined in `shared/schema.ts`.
- **Key Features**:
    - **Authentication & Security**: Login/logout, JWT, permissions, audit logs.
    - **Project Management**: CRUD operations, project types, financial transfers.
    - **Worker Management**: Attendance, wages, transfers, petty cash, settlements.
    - **Suppliers & Procurement**: Supplier, material, procurement, payment management.
    - **Well Management**: Wells, tasks, accounting, expenses, auditing.
    - **Equipment**: Basic equipment tracking and inter-project transfers.
    - **Unified Notifications**: Single notification system with read statuses.
    - **AI**: Chat, messaging, usage statistics.
    - **Backup**: Manual/automatic backups, history logs.
    - **Reporting**: Centralized `/reports` endpoint.
    - **Ledger System**: Double-entry bookkeeping, chart of accounts, financial audit, automatic reconciliation.
- **Technical Standards**: Adheres to `fullstack_js` guidelines, uses `shadcn/ui` components, `data-testid` attributes for testing, and all system responses are in Arabic.
- **React Query Architecture**: Centralized query keys in `client/src/constants/queryKeys.ts` and API endpoints in `client/src/constants/api.ts`. Enforces strict rules against direct string query keys and encourages scoped cache invalidation. Dynamic keys use dedicated functions.
- **Pull to Refresh System**: Implemented using `client/src/hooks/use-pull-to-refresh.ts`, `client/src/components/ui/pull-to-refresh.tsx`, and `client/src/constants/pullRefreshConfig.ts`. Integrates with React Query `refetchQueries` and is active on 27 pages, excluding login, register, settings, and security. Features include parallel refresh prevention, minimum spinner duration, toast notifications on failure, and RTL support.
- **Financial Architecture**: A unified double-entry ledger system with 6 tables (`account_types`, `journal_entries`, `journal_lines`, `financial_audit_log`, `reconciliation_records`, `summary_invalidations`), `FinancialLedgerService` for writing, and `ExpenseLedgerService` for reading reports. All financial paths are integrated with `safeRecord` calls across `financialRoutes.ts` and `workerRoutes.ts` for consistent double-entry recording, ensuring non-blocking operations.
- **Rate Limiting**: `generalRateLimit` is active (5000 requests/15 minutes) with a custom JSON handler.
- **Sync Audit System**: Server-side immutable audit log (`sync_audit_logs` table) with `SyncAuditService` for automatic logging of all sync operations (full-backup, delta-sync, instant-sync). API at `/api/sync-audit` with `/logs` (filtered/paginated), `/stats`, and `/modules` endpoints. Frontend tab "تدقيق الخادم" in SyncManagementPage with filters (module, status, action, search), pagination, stats cards, and expandable log details. Query keys: `QUERY_KEYS.syncAuditLogs`, `syncAuditStats`, `syncAuditModules`, `syncAuditLogsFiltered(params)`.

### External Dependencies
- **Frontend Frameworks**: React, Vite
- **UI Library**: shadcn/ui
- **Styling**: TailwindCSS
- **Backend Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Testing**: Vitest
- **Mobile Development**: Capacitor (for Android builds)
- **Android Libraries**: `@byteowls/capacitor-filesharer`