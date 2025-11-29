# Construction Project Management System

## Recent Changes

### November 29, 2025 - Comprehensive Unified Reports Dashboard + International Date/Number Format ✅ COMPLETED
- **Deleted Old Report Pages**: Removed fragmented report pages
  - ✅ Deleted `daily-expenses.tsx`
  - ✅ Deleted `excel-style-daily-expenses.tsx`
  - ✅ Deleted `excel-style-worker-statement.tsx`
  - ✅ Deleted `worker-misc-expenses.tsx`
- **New Unified Reports Center** (`reports.tsx`) - تصميم احترافي عالمي:
  - ✅ تبويبات متقدمة: المصاريف اليومية + بيان العامل
  - ✅ شريط فلتر موحد متكامل لكل تبويب
  - ✅ بطاقات ملخص بيانات: عرض مرئي للأرقام والنسب المئوية
  - ✅ جداول احترافية مع تمييز الألوان والفواصل الدقيقة
  - ✅ تصميم موحد يطابق معايير المنصات العالمية (Material Design)
  - ✅ استجابة كاملة على الهاتف والتابلت والديسكتوب
  - ✅ تحسينات UX/UI: hover effects, transitions, spacing دقيق
  - ✅ فلترة متقدمة: تواريخ, اختيار العمال, إعادة تعيين سريعة
  - ✅ تصدير Excel و طباعة احترافية
  - ✅ واجهة عربية كاملة (RTL compatible)
  - ✅ ألوان احترافية: أزرق (البيانات)، أخضر (الدفع)، رمادي (خلفيات)
- **International Date & Number Format** - معايير عالمية:
  - ✅ جميع التواريخ بالصيغة البريطانية: DD/MM/YYYY مع أرقام إنجليزية
  - ✅ جميع الأوقات بصيغة 24 ساعة: HH:MM:SS مع أرقام إنجليزية
  - ✅ جميع الأرقام والمبالغ بالإنجليزية مع فواصل الآلاف
  - ✅ تحديث `formatDate()` لاستخدام `en-GB` locale
  - ✅ تحديث `formatTime()` للأرقام الإنجليزية فقط
  - ✅ تحديث `formatCurrency()` لعرض أرقام إنجليزية (en-US)
  - ✅ تحديث جميع الملفات: `arabic-utils.ts`, `equipment-movement-history-dialog.tsx`, `EnhancedErrorDisplay.tsx`, `enhanced-worker-card.tsx`, `notifications-dropdown.tsx`, `SecurityPoliciesPage.tsx`, `equipment-management.tsx`, `excel-export-utils.ts`
- **تحديثات التنقل**:
  - ✅ حذف الصفحات القديمة من App.tsx
  - ✅ توحيد جميع مسارات التقارير إلى `/reports`
  - ✅ تحديث الشريط السفلي، الرأس العلوي، الإجراءات السريعة
  - ✅ حذف المسارات المكررة من header.tsx
- **النتائج**:
  - ✅ مركز تقارير موحد احترافي
  - ✅ تصميم يطابق المنصات الدولية (Google Material, Apple HIG)
  - ✅ جميع التواريخ والأوقات والأرقام بالمعايير الدولية
  - ✅ أداء سلس على جميع الأجهزة
  - ✅ بناء ناجح بدون أخطاء
  - ✅ التطبيق يعمل بصحة على المنفذ 5000

## Overview
A comprehensive construction project management system designed for the Middle East, featuring a full Arabic interface with RTL support. This full-stack web and mobile application provides advanced financial management, project tracking, worker management, material purchasing, and intelligent reporting. Its primary purpose is to offer construction companies a complete solution for efficient operational management, with a vision for significant market potential in the region.

## User Preferences
- Preferred communication style: Simple, everyday language
- Deployment: Automated script for production server (93.127.142.144:6000)
- Real-time updates: Must be immediate for all CRUD operations

## System Architecture

### Frontend Architecture
- **Core Technology**: React 18 with TypeScript, Vite as the build tool.
- **UI Framework**: Tailwind CSS with shadcn/ui for consistent design.
- **State Management**: React Query for server state, Zustand for client state.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Management**: React Hook Form with Zod validation.
- **RTL Support**: Full Arabic interface with right-to-left layout optimization.
- **Design System**: Material Design principles with culturally appropriate color schemes.
- **UI/UX Decisions**: Responsive layouts adapting from mobile (single column) to desktop (multi-column) using CSS Grid. CompactFieldGroup components for efficient form layouts.

### Backend Architecture
- **Core Framework**: Express.js with TypeScript.
- **API Design**: RESTful APIs with Zod validation.
- **Authentication**: JWT-based with access/refresh tokens.
- **Security**: bcrypt password hashing, SQL injection protection, rate limiting.
- **Database ORM**: Drizzle ORM for type-safe operations.
- **Real-time Communication**: Socket.IO for WebSocket-based real-time updates across the application.
- **Error Handling**: Comprehensive error tracking and logging.

### Database Design
- **Primary Database**: PostgreSQL (app2data).
- **Schema Management**: 47+ tables covering users, projects, workers, expenses, and materials.
- **Data Integrity**: Foreign key constraints, unique constraints, and indexing.
- **Performance**: Materialized views for complex queries, optimized indexes.

### Security Architecture
- **Authentication**: Multi-factor authentication (TOTP).
- **Session Management**: Secure session tracking with device fingerprinting.
- **Data Protection**: AES-256-GCM encryption for sensitive data.
- **API Security**: Helmet.js, CORS configuration, rate limiting.
- **Database Security**: Parameterized queries, input validation.
- **Secret Management**: Automated key generation and validation, environment variable usage for sensitive data.

### Performance Optimization
- **Database**: Query optimization, connection pooling, materialized views.
- **Frontend**: Code splitting, lazy loading, optimized bundle sizes, React Query caching.
- **Build Optimization**: Vite for fast builds.

### Mobile Application
- **Technology**: React Native with Expo 52.0.
- **Feature Parity**: Identical functionality and UI to the web application, including RTL support.

## External Dependencies

### Database Services
- **Production Database**: External PostgreSQL server (93.127.142.144:5432).
- **Legacy Database**: Supabase PostgreSQL (for data migration).

### Development Tools
- **Package Manager**: npm.
- **Build Tools**: Vite (frontend), esbuild (backend).
- **Type Checking**: TypeScript.
- **Code Quality**: ESLint, Prettier.

### Deployment Infrastructure
- **Process Manager**: PM2 (cluster mode).
- **Environment**: Linux server with systemd.
- **Monitoring**: Application logs, error tracking.

### Third-Party Integrations
- **UI Components**: Radix UI primitives via shadcn/ui.
- **Fonts**: Google Fonts (Cairo).
- **Charts**: Recharts.
- **Excel Export**: ExcelJS.
- **Authentication**: Speakeasy (TOTP), bcrypt (password hashing), jsonwebtoken (JWT).