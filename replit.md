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

## Strict Analytical & Quality Protocol (Mandatory)
- **Zero Ambiguity:** No dodging, generalizing, or guessing. If information is missing, request it explicitly.
- **Step-by-Step Analysis:** Every response must be preceded by a logical breakdown of the problem.
- **Realism Over Creativity:** Propose unconventional solutions only if they are proven to be cost-effective and executable.
- **No Flattery:** Present technical reality as it is, even if it contradicts user initial assumptions.
- **Error Handling:** Solutions must include "out of the box" recovery strategies for potential failures.
- **Confidence Rating:** Explicitly state the uncertainty level if a solution is not 100% verified.
