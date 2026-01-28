# Project Overview: Industrial Operations Management System
## Current State (January 26, 2026)
- **Backend:** Node.js/Express with Drizzle ORM.
- **Frontend:** React/Vite with Shadcn UI and Tailwind CSS.
- **Database:** PostgreSQL (Central DB active, Supabase fallback available).
- **Core Features:**
    - AI-powered analysis and reporting.
    - Advanced synchronization and monitoring.
    - Automated health checks and circuit breaker implementation.
    - Integrated notification system and secure data fetching.

## Architectural Decisions
- **Smart Connection Manager:** Manages multiple database providers with priority routing.
- **Circuit Breaker:** Implemented to handle slow or failing external dependencies.
- **Unified Env Loader:** Ensures consistent environment variable management across environments.

## User Preferences
- **Language:** Arabic/English support.
- **Style:** Modern professional UI with dark/light mode.
- **Testing:** Integration tests focused on API simulation.
