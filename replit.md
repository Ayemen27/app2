# مدير المشاريع الإنشائية (Construction Project Manager)

## Overview
A comprehensive construction project management system designed specifically for Arabic-speaking markets. This full-stack application provides advanced project management capabilities, financial tracking, worker management, and material management with complete RTL (Right-to-Left) support. The system features a modern web application, mobile app, and sophisticated backend infrastructure built for scalability and security.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript, Vite build system, Tailwind CSS with shadcn/ui components
- **State Management**: React Query for server state, Zustand for client state, React Hook Form with Zod validation
- **UI Framework**: Complete RTL support, Material Design principles, bottom navigation with floating action button
- **Routing**: Wouter for client-side routing with protected routes and role-based access
- **Key Features**: Dashboard, project management, worker attendance, financial tracking, material purchases, equipment management, and comprehensive reporting

### Backend Architecture
- **Runtime**: Node.js with Express.js and TypeScript
- **API Design**: RESTful endpoints with comprehensive input validation using Zod schemas
- **Authentication**: JWT-based authentication with refresh tokens, session management, and role-based authorization
- **Security**: Helmet for security headers, CORS configuration, rate limiting, bcrypt password hashing
- **Performance**: Connection pooling, materialized views, optimized database queries

### Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: 47+ tables covering projects, workers, materials, suppliers, financial transactions, and system logs
- **Data Migration**: Comprehensive migration system from Supabase to local PostgreSQL instance
- **Performance Features**: Strategic indexing, materialized views for complex queries, automated cleanup procedures

### Mobile Application
- **Framework**: React Native with Expo 52.0
- **Features**: Complete feature parity with web application, offline-first design, real-time synchronization
- **UI/UX**: Full RTL support, native navigation patterns, Arabic language interface

### Security & Monitoring
- **Authentication**: Multi-factor authentication support, secure session management
- **Error Tracking**: Advanced error logging and monitoring system with detailed analytics
- **Performance Monitoring**: Database performance analysis, query optimization recommendations
- **Compliance**: Security policy framework with automated compliance checking

### AI & Intelligence Features
- **Smart Analytics**: Intelligent project cost analysis and predictions
- **Automated Recommendations**: Resource optimization suggestions based on historical data
- **Performance Insights**: Worker productivity analysis and equipment utilization tracking
- **Financial Intelligence**: Cash flow predictions and budget variance analysis

## External Dependencies

### Database Services
- **Primary**: PostgreSQL database hosted at 93.127.142.144 (app2data)
- **Migration Source**: Supabase PostgreSQL (wibtasmyusxfqxxqekks.supabase.co)
- **Connection**: Drizzle ORM with connection pooling and SSL configuration

### Development Tools
- **Package Manager**: npm with comprehensive dependency management
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint integration, automated formatting

### Authentication & Security
- **Token Management**: JWT tokens with configurable expiration
- **Password Security**: bcrypt with configurable salt rounds
- **Session Management**: Database-backed session storage with device tracking

### UI Components & Styling
- **Component Library**: Radix UI primitives via shadcn/ui
- **Styling**: Tailwind CSS with custom Arabic font support (Cairo)
- **Icons**: Comprehensive icon system with Arabic context

### Production Environment
- **Process Manager**: PM2 for application lifecycle management
- **Domain**: app2.binarjoinanelytic.info
- **Monitoring**: Comprehensive logging and error tracking systems