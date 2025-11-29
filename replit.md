# Construction Project Management System

## Overview
A comprehensive construction project management system designed for the Middle East, featuring a full Arabic interface with RTL (Right-to-Left) support. The system provides advanced financial management tools, project tracking, worker management, material purchasing, and intelligent reporting capabilities. Built as a full-stack web application with a matching mobile app, it serves as a complete solution for construction companies to manage their operations efficiently.

## Recent Changes

### November 29, 2025 - Socket.IO Real-Time Updates & Complete API Routing Fix
- **CRITICAL FIXES COMPLETED**:
  - Fixed API routing issue where POST/DELETE/GET requests were returning HTML instead of JSON
  - Root cause: Vite catch-all middleware was intercepting `/api/*` and module requests
  - Solution: Modified `server/vite.ts` to:
    - Skip `/api/*` routes with `if (req.originalUrl.startsWith('/api/')) return next()`
    - Skip static assets/modules: `if (url.startsWith('/@') || url.includes('?') || /\.\w+$/i.test(url))`
    - Only serve index.html for navigation requests (paths without file extensions)
- **Socket.IO Integration Complete**: Implemented WebSocket for real-time updates
  - Added Socket.IO server initialization in `server/index.ts`
  - Broadcast events on worker attendance updates via `io.emit('entity:update', ...)`
  - Enabled `useWebSocketSync()` hook in `App.tsx` for client-side listening
  - Global `io` instance available at `(global as any).io` for mutations
- **Results**: 
  - ✅ All API endpoints return JSON correctly
  - ✅ Real-time updates functional
  - ✅ Vite modules load correctly (main.tsx, dependencies, assets)
  - ✅ SPA routing works (serves index.html for navigation paths)
  - ✅ Verified: `curl http://localhost:5000/api/health` returns JSON

### November 28, 2025 - Real-Time Data Updates & Deployment Scripts
- **Fixed Real-Time Updates**: Added `refetchQueries()` to all mutations - now deletes/edits update UI immediately
- **Deployment Automation**: Created comprehensive deployment script (`DEPLOY_TO_SERVER.sh`) that:
  - Builds application (vite + esbuild)
  - Creates deployment package
  - Uploads to remote server via SCP
  - Installs npm dependencies
  - Restarts application with PM2
  - Verifies health check
- **Port Configuration**: Updated to run on port 6000 (was 5000)
- **Environment Files**: Updated `.env.production` and `ecosystem.config.cjs` for port 6000
- **Deployment Docs**: Created `DEPLOYMENT_README.md` with full deployment guide
- **Secure Credentials**: All SSH credentials read from Secrets (SSH_HOST, SSH_USER, SSH_PASSWORD)

### November 2025 - Production Security Hardening
- **CORS Security**: Fixed CORS configuration to use dynamic REPLIT_DOMAINS instead of placeholder URL
- **Credentials Security**: Removed ALL hardcoded secrets from credentials.ts - now uses environment variables only
- **Log Masking**: Implemented sensitive data masking in all database connection logs (connection strings hidden with ***)
- **Supabase Integration**: Added isSupabaseConfigured() check for graceful fallback when Supabase is not configured
- **Production Logging**: Reduced log verbosity in production mode (schema checks, connection details)
- **LSP Fixes**: Fixed Drizzle ORM Table.Symbol errors using getTableName/getTableColumns API
- **Deployment Config**: Configured autoscale deployment with npm build and npm start commands
- **Required Secrets**: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (must be set in Replit Secrets)

### November 2025 - Permissions Management System (قيد التطوير)
- **New Module**: نظام إدارة الصلاحيات في مجلد `permissions-system/`
- **Database Tables**: 
  - `user_project_permissions`: ربط المستخدمين بالمشاريع مع صلاحيات CRUD
  - `permission_audit_logs`: سجل كامل لجميع تغييرات الصلاحيات
- **Services**:
  - `access-control.service.ts`: خدمة التحكم بالصلاحيات
  - `audit-log.service.ts`: خدمة سجل التغييرات
- **APIs**: 11 endpoint لإدارة الصلاحيات (ربط، فصل، تحديث، عمليات مجمعة)
- **الحالة**: 35% مكتمل - انظر `permissions-system/docs/DEVELOPMENT_PLAN.md`
- **المتبقي**: إصلاح LSP، ربط المسارات، إنشاء واجهة المستخدم
- **الهدف**: كل مستخدم يرى فقط مشاريعه، المدير الأول يرى الكل

### November 2025 - Form Layout Components (CompactFieldGroup)
- **New Components**: مكونات تخطيط نماذج في `components/ui/form-grid.tsx`
  - **FormGrid**: تخطيط شبكي 12 عمود مع دعم RTL
  - **FormFieldWrapper**: تغليف حقول مع أحجام متعددة (full, half, third, quarter)
  - **CompactFieldGroup**: تجميع 2-4 حقول في صف واحد على الشاشات الكبيرة
- **Updated Forms**:
  - `add-project-form.tsx`: حقلين في صف (اسم المشروع + الحالة)
  - `add-supplier-form.tsx`: تجميع الشخص المسؤول + الهاتف، العنوان + شروط الدفع
  - `add-worker-form.tsx`: 3 حقول في صف (الاسم + النوع + الأجر)
  - `add-equipment-dialog.tsx`: تجميع الفئة + الحالة، التاريخ + السعر
  - `transfer-equipment-dialog.tsx`: تجميع سبب النقل + المسؤول
- **Responsive Behavior**: عمود واحد على الهاتف، 2-3 أعمدة على الشاشات الكبيرة

### November 2025 - Smart Form Layout System (CSS Grid)
- **Form Grid System**: نظام تخطيط نماذج ذكي في index.css
  - **form-grid**: تخطيط شبكي يتكيف مع حجم الشاشة (1 column على الهاتف → 2 columns على التابلت → 3 columns على سطح المكتب)
  - **form-field**: حقل نموذج مع تنسيق موحد
  - **form-field-full**: حقول كبيرة تأخذ الصف كاملاً (الوصف، الملاحظات، الكنوات)
  - **form-actions**: صف الأزرار مع تنسيق موحد
- **Implementation**: تطبيق النظام على جميع النماذج الرئيسية:
  - نموذج Dashboard (إضافة عامل + إضافة مشروع)
  - نموذج إضافة المورد في material-purchase.tsx
  - نموذج تحويل الأموال في project-transfers.tsx
- **Result**: توفير مساحة أفضل، عرض أنظف، تجربة مستخدم محسنة على جميع الأجهزة

### September 2025 - Worker Attendance UI Enhancements
- **View Mode System**: إضافة نظام أوضاع العرض الثلاثة في صفحة حضور العمال
- **Mobile Responsiveness**: تحسين responsive design مع breakpoints محسنة

## User Preferences
- Preferred communication style: Simple, everyday language
- Deployment: Automated script for production server (93.127.142.144:6000)
- Real-time updates: Must be immediate for all CRUD operations

## Deployment Information
- **Domain**: https://app2.binarjoinanelytic.info (custom domain)
- **Server**: 93.127.142.144
- **Port**: 6000 (production, internal)
- **SSH User**: administrator
- **Process Manager**: PM2 (cluster mode, 2 instances)
- **Auto-Deploy Script**: `DEPLOY_CUSTOM_DOMAIN.sh` (in app2 folder)
- **Quick Deploy**: `RUN_DEPLOYMENT.sh` (checks for sshpass)
- **Documentation**: `DEPLOYMENT_README.md`, `DEPLOYMENT_SUMMARY.md`, `DEPLOY_INSTRUCTIONS.txt`

## System Architecture

### Frontend Architecture
- **Core Technology**: React 18 with TypeScript, using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query (@tanstack/react-query) for server state, Zustand for client state
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation schemas
- **RTL Support**: Full Arabic interface with right-to-left layout optimization
- **Design System**: Material Design principles with culturally appropriate color schemes
- **Navigation**: Bottom navigation with floating action button for mobile-first experience

### Backend Architecture
- **Core Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful APIs with comprehensive validation using Zod schemas
- **Authentication**: JWT-based authentication with access/refresh token pairs
- **Security**: bcrypt password hashing (12 salt rounds), SQL injection protection via ORM, rate limiting
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Environment Management**: Advanced environment variable loading with fallback systems
- **Error Handling**: Comprehensive error tracking with detailed logging and monitoring

### Database Design
- **Primary Database**: PostgreSQL (app2data) hosted on external server
- **Migration Source**: Supabase PostgreSQL (legacy system for data migration)
- **Schema Management**: 47+ tables covering all business operations
- **Key Tables**: users, projects, workers, worker_attendance, materials, material_purchases, fund_transfers, daily_expense_summaries
- **Data Integrity**: Foreign key constraints, unique constraints, and comprehensive indexing
- **Performance**: Materialized views for complex queries, optimized indexes for frequent operations

### Security Architecture
- **Authentication**: Multi-factor authentication support with TOTP
- **Session Management**: Secure session tracking with device fingerprinting
- **Data Protection**: AES-256-GCM encryption for sensitive data
- **API Security**: Helmet.js for security headers, CORS configuration, rate limiting
- **Database Security**: Parameterized queries, input validation, SQL injection prevention
- **Secret Management**: Automated secret key generation and validation system

### Performance Optimization
- **Database**: Query optimization, connection pooling, materialized views for reporting
- **Frontend**: Code splitting, lazy loading, optimized bundle sizes with manual chunks
- **Caching**: React Query for intelligent data caching with stale-while-revalidate patterns
- **Build Optimization**: Vite for fast development and optimized production builds

### Mobile Application
- **Technology**: React Native with Expo 52.0
- **Feature Parity**: 100% identical functionality to web application
- **Synchronization**: Real-time data sync with same backend database
- **UI Consistency**: Matching Arabic RTL interface design

## External Dependencies

### Database Services
- **Production Database**: app2data PostgreSQL on external server (93.127.142.144:5432)
- **Legacy Database**: Supabase PostgreSQL for data migration purposes

### Development Tools
- **Package Manager**: npm with package-lock.json for dependency locking
- **Build Tools**: Vite for frontend, esbuild for backend bundling
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint, Prettier, comprehensive tsconfig setup

### Deployment Infrastructure
- **Process Manager**: PM2 with ecosystem.config.json for production deployment
- **Environment**: Production deployment on Linux server with systemd integration
- **Monitoring**: Application logs, error tracking, performance monitoring

### Third-Party Integrations
- **UI Components**: Radix UI primitives via shadcn/ui
- **Fonts**: Google Fonts (Cairo) for Arabic text rendering
- **Charts**: Recharts for data visualization
- **Excel Export**: ExcelJS for report generation
- **Authentication**: Speakeasy for TOTP implementation
- **Security**: bcrypt for password hashing, jsonwebtoken for JWT handling