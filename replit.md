# Construction Project Management System

## Recent Changes

### December 01, 2025 - Bottom Navigation Gallery Link ✅ COMPLETED
- **إضافة رابط المعرض إلى قائمة المزيد**:
  - ✅ تم إضافة فئة جديدة "مكتبات ومراجع"
  - ✅ رابط سريع لـ `/component-gallery` من الشريط السفلي
  - ✅ أيقونة Palette ووصف واضح
  - ✅ متاح لجميع المستخدمين (غير مشروط بدور الإدارة)

### December 01, 2025 - Report Printer Templates Section ✅ COMPLETED
- **قسم قوالب التقارير الجديد**:
  - ✅ 5 قوالب تقارير احترافية مختلفة
  - ✅ ReportTemplate1 - تقرير يومي بسيط (list format)
  - ✅ ReportTemplate2 - تقرير إحصائيات شهري (modern stats)
  - ✅ ReportTemplate3 - تقرير مالي احترافي (income/expenses/balance)
  - ✅ ReportTemplate4 - ملخص يومي (timeline-based)
  - ✅ ReportTemplate5 - تقرير حالة المشروع (executive summary)
- **التكامل مع المعرض**:
  - ✅ تم إضافة tab جديد "قوالب التقارير"
  - ✅ جميع القوالب قابلة للطباعة والتحميل والمشاركة
  - ✅ يدعم اللغة العربية بشكل كامل

### December 01, 2025 - Full Page Component Detail View ✅ COMPLETED
- **Removed Modal Panel**: Replaced SmartInspectorPanel Modal with full-page detail view
- **صفحة عرض كاملة**:
  - ✅ ComponentDetailPage - صفحة حقيقية لعرض مكون واحد
  - ✅ شريط موحد واحد في الأعلى يحتوي على جميع المميزات
  - ✅ زر العودة "عودة" في الأعلى واضح جداً باللون الذهبي
  - ✅ أزرار التنقل (السابق/التالي) للمكونات
- **تحسينات الواجهة**:
  - ✅ معاينة المكون في وسط الصفحة بحجم كبير
  - ✅ أشرطة (Preview, HTML, CSS) موحدة في الشريط العلوي
  - ✅ حالات المكون (default, hover, focused, active, disabled, loading)
  - ✅ نسخ الكود بزر واحد واضح
- **التنقل والتجربة**:
  - ✅ الضغط على "معاينة كاملة" ينقل إلى صفحة جديدة
  - ✅ يمكن التنقل بين المكونات باستخدام أزرار التنقل
  - ✅ ESC أو زر العودة يعيدك للمعرض

### December 01, 2025 - Advanced Smart Gallery System ✅ COMPLETED
- **محسّنات أداء عالمية**:
  - ✅ Virtualization hook للتعامل مع عدد كبير من المكونات
  - ✅ React.memo optimization على جميع المكونات
  - ✅ useCallback للدوال الضرورية
  - ✅ useMemo للعمليات الحسابية المعقدة
- **مكونات ذكية قليلة الاستهلاك للمساحة**:
  - ✅ CompactComponentCard - بطاقات محسّنة بحجم كبير (280-320px)
  - ✅ CompactGalleryGrid - شبكة محسّنة بتباعد 6px
  - ✅ ComponentDetailPage - صفحة عرض كاملة للمكون الواحد
- **تقنيات حديثة متقدمة**:
  - ✅ Custom Hook useVirtualization للأداء العالي
  - ✅ استخدام memo و useCallback على جميع المكونات
  - ✅ ScrollArea محسّنة للمعاينات
  - ✅ Responsive design متطور (mobile-first)

## Overview
A comprehensive construction project management system designed for the Middle East, featuring a full Arabic interface with RTL support. This full-stack web and mobile application provides advanced financial management, project tracking, worker management, material purchasing, and intelligent reporting. Its primary purpose is to offer construction companies a complete solution for efficient operational management, with a vision for significant market potential in the region.

## User Preferences
- Preferred communication style: Simple, everyday language
- Deployment: Automated script for production server (93.127.142.144:6000)
- Real-time updates: Must be immediate for all CRUD operations
- UI/UX: Full-page views preferred over modals; clear navigation

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
- **Component Gallery**: Professional isolated showcase at `/component-gallery` with:
  - 16 تصميم بحث متقدمة (8 محسّنة)
  - 6 بطاقات مضغوطة متخصصة
  - Full-page ComponentDetailPage for detailed component view
  - Unified header bar with all features
  - Full state handling, accessibility, and RTL support

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
- **Component Gallery**: Isolated from main app, optimized for showcase and development.
- **Virtualization**: Smart virtualization for handling thousands of components.

### Mobile Application
- **Technology**: React Native with Expo 52.0.
- **Feature Parity**: Identical functionality and UI to the web application, including RTL support.

## Component Gallery Structure
```
component-gallery/
├── index.tsx                          # Main gallery page + routing
├── README.md                          # Documentation
├── shared/
│   ├── design-tokens.ts              # Colors, spacing, typography
│   ├── types.ts                      # TypeScript interfaces
│   ├── constants.ts                  # Gallery constants
│   └── utils.ts                      # Utility functions
├── data/
│   └── catalog.ts                    # Component metadata
├── hooks/
│   ├── useInspector.ts               # Inspector state management
│   ├── useGallerySettings.ts         # Gallery settings
│   ├── useCopyCode.ts                # Copy to clipboard
│   └── useVirtualization.ts          # Performance optimization
├── layout/
│   ├── GalleryLayout.tsx             # Main wrapper
│   ├── GalleryHeader.tsx             # Header with search
│   ├── GalleryFooter.tsx             # Footer
│   ├── CategoryTabs.tsx              # Tab navigation
│   ├── CompactComponentCard.tsx      # Card wrapper (280-320px)
│   ├── CompactGalleryGrid.tsx        # Grid layout (1-3 columns)
│   ├── ComponentDetailPage.tsx       # Full-page component detail (NEW)
│   └── InspectorPanel.tsx            # Code inspector (legacy)
└── modules/
    ├── search/
    │   ├── components/
    │   │   ├── SearchDesign1.tsx     # Minimal inline
    │   │   ├── SearchDesign2.tsx     # Card-style
    │   │   ├── SearchDesign3.tsx     # Sidebar filters
    │   │   ├── SearchDesign4.tsx     # Floating bar
    │   │   ├── SearchDesign5.tsx     # Multi-field
    │   │   ├── SearchDesign6.tsx     # Advanced modal
    │   │   ├── SearchDesign7.tsx     # Tag-driven
    │   │   ├── SearchDesign8.tsx     # Voice search
    │   │   └── index.ts              # Exports
    │   └── index.ts
    └── cards/
        ├── components/
        │   ├── CardDesign1.tsx       # Worker card
        │   ├── CardDesign2.tsx       # Expense card
        │   ├── CardDesign3.tsx       # Project card
        │   ├── CardDesign4.tsx       # Product card
        │   ├── CardDesign5.tsx       # Activity card
        │   ├── CardDesign6.tsx       # Generic card
        │   └── index.ts              # Exports
        └── index.ts
```

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
