# Construction Project Management System

## Overview
A comprehensive construction project management system designed for the Middle East, featuring a full Arabic interface with RTL (Right-to-Left) support. The system provides advanced financial management tools, project tracking, worker management, material purchasing, and intelligent reporting capabilities. Built as a full-stack web application with a matching mobile app, it serves as a complete solution for construction companies to manage their operations efficiently.

## Recent Changes

### November 2025 - Smart Form Layout System (Responsive Grid)
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
Preferred communication style: Simple, everyday language.

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