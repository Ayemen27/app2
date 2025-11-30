# Construction Project Management System

## Recent Changes

### November 30, 2025 - Professional Component Gallery ✅ COMPLETED
- **احترافي Component Gallery معزول** في `/component-gallery`:
  - ✅ 8 تصاميم بحث متقدمة (Minimal inline, Card-style, Sidebar filters, Floating bar, Multi-field, Advanced modal, Tag-driven, Voice search)
  - ✅ 6 بطاقات مضغوطة متخصصة (Worker, Expense, Project, Product, Activity, Generic)
  - ✅ دعم RTL كامل (Arabic RTL support)
  - ✅ State handling شامل (idle, loading, error, hover, disabled, selected, focused)
  - ✅ Accessibility محسّنة (ARIA labels, roles, semantic HTML, keyboard navigation)
  - ✅ Inspector Panel مع عرض/نسخ/تصدير الكود
  - ✅ Responsive 100% (mobile-first design)
  - ✅ 21 ملف TSX منظم بعناية
  - ✅ تصميم مستوحى من Material Design و Apple HIG

### November 29, 2025 - Comprehensive Unified Reports Dashboard + International Date/Number Format ✅ COMPLETED
- **Deleted Old Report Pages**: Removed fragmented report pages
  - ✅ Deleted `daily-expenses.tsx`
  - ✅ Deleted `excel-style-daily-expenses.tsx`
  - ✅ Deleted `excel-style-worker-statement.tsx`
  - ✅ Deleted `worker-misc-expenses.tsx`
- **New Unified Reports Center** (`reports.tsx`) - تصميم احترافي عالمي
- **International Date & Number Format** - معايير عالمية
- **تحديثات التنقل** - توحيد جميع مسارات التقارير

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
- **Component Gallery**: Professional isolated showcase at `/component-gallery` featuring 8 search/filter designs + 6 card components with full state handling, accessibility, and RTL support.

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

### Mobile Application
- **Technology**: React Native with Expo 52.0.
- **Feature Parity**: Identical functionality and UI to the web application, including RTL support.

## Component Gallery Structure
```
component-gallery/
├── index.tsx                          # Main gallery page
├── README.md                          # Documentation
├── shared/
│   ├── design-tokens.ts              # Colors, spacing, typography
│   ├── types.ts                      # TypeScript interfaces
│   └── constants.ts                  # Gallery constants
├── data/
│   └── catalog.ts                    # Component metadata
├── layout/
│   ├── GalleryLayout.tsx             # Main wrapper
│   ├── GalleryHeader.tsx             # Header
│   ├── GalleryFooter.tsx             # Footer
│   ├── CategoryTabs.tsx              # Tab navigation
│   ├── ComponentCard.tsx             # Card wrapper
│   ├── GalleryGrid.tsx               # Grid layout
│   └── InspectorPanel.tsx            # Code inspector
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
