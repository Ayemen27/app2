## Overview

BinarJoin is an ambitious project aimed at creating a 100% Offline-First project management application specifically designed for construction projects. The core vision is to provide a robust, reliable, and high-performance system where users can seamlessly work offline with a local database mirror and have their data synchronized bi-directionally with a server-side PostgreSQL database. The project is currently in Phase 2, having successfully mirrored 66 server tables to a local IndexedDB, establishing a unified synchronization system. The ultimate goal is to achieve global performance standards, comprehensive data security, and intelligent conflict resolution for a seamless user experience in challenging environments.

## User Preferences

1.  **Analysis Before Execution:** Do not provide the first answer that comes to mind; analytical thinking should be step-by-step.
2.  **Honesty and Accuracy:** No deception or flattery. Present reality as it is, and state clearly when you do not know.
3.  **No Guessing:** Do not fabricate information or give unconfirmed answers. If information is incomplete, ask for it clearly.
4.  **Tool Efficiency:** Do not use the `search_codebase` tool (currently disabled and causes agent suspension). Use `ls`, `read`, `grep`, and `bash` instead.
5.  **Quality Solutions:** Choose the most realistic and implementable solution. Suggest unconventional solutions only when common ones fail and in a logical manner.
6.  **Speed vs. Accuracy:** Accuracy always takes precedence over speed. Do not rush at the expense of code correctness or system stability.
7.  **Mandatory Rules for Agents:** Every new AI agent MUST explicitly acknowledge and state its commitment to the following rules before starting any conversation:
    - **Forbidden:** Evasion, Generalization, Uncertain answers, Fabrication, Rushing at the expense of accuracy.
    - **Obligatory:** Step-by-step analytical thinking, Explicitly stating unknown information, Proposing realistic/practical solutions, Clarifying assumptions.
    - **Decision Logic:** If a solution is uncertain → State the level of uncertainty. If info is missing → Ask for it clearly. If multiple solutions exist → Choose the best and explain why.
    - **No Flattery:** Present the reality as it is, even if uncomfortable.
    - **Thinking Process:** 1. Short traditional solution. 2. Alternative smart/cost-effective solution. 3. Unconventional logical solution (if needed).
    - **Consistency:** Never give the first answer without evaluation.

## System Architecture

The system employs an Offline-First architecture, prioritizing local data availability and synchronization.

**UI/UX Decisions:**
The frontend is built with React Components, integrating with React Query for efficient data caching.

**Technical Implementations:**
-   **Local Storage:** IndexedDB serves as the primary local storage for a complete mirror of 66 PostgreSQL tables from the server. It stores the `syncQueue` for offline operations and `syncMetadata`.
-   **Synchronization Manager:** A unified `Sync Manager` (`sync.ts`) handles all synchronization logic, including:
    -   `initSyncListener()`: Monitors online/offline status and triggers automatic synchronization.
    -   `loadFullBackup()`: Fetches all data (66 tables) from the server.
    -   `syncOfflineData()`: Synchronizes pending operations from the local queue.
    -   `subscribeSyncState()`: Allows components to subscribe to synchronization state changes.
-   **Data Interfaces:** All 66 tables in IndexedDB have corresponding Typed Interfaces for enhanced type safety and developer experience.
-   **Backend API:** An Express-based API server exposes a `/api/sync/full-backup` endpoint to provide a comprehensive data backup of all 66 tables.

**Feature Specifications:**
-   **Offline Data Mirror:** 66 server tables are fully mirrored in IndexedDB with indexes for `createdAt` and `projectId`.
-   **Optimized IndexedDB:** `db.ts` is updated with all 66 table definitions, including helper functions `saveSyncedData()`, `clearTable()`, and `clearAllData()`.
-   **Robust Synchronization:** `sync.ts` implements a unified synchronization system with retry logic (5 retries, 2-second delay) and a synchronization interval of 30 seconds.
-   **Project Structure:** The `client/src/offline/` directory centralizes all offline synchronization logic, including `sync.ts`, `db.ts`, `offline.ts` (queue), `offline-queries.ts`, `offline-mutations.ts`, and `conflict-resolver.ts`.

**System Design Choices:**
-   **Domain Management:** Dynamic environment detection for Replit (`replit.dev`) and Production (`binarjoinanelytic.info`). Fixed spelling from `biner` to `binar`.
-   **Environment Variables:** Added `PRODUCTION_DOMAIN` as the source of truth for all external service references.
-   **API Strategy:** Frontend uses `window.location.origin` dynamically, while mobile builds (APK) use `VITE_API_BASE_URL` with a fallback to the production domain.
-   **Database:** IndexedDB version 7 with 66 mirrored tables.
-   **Unified Sync System:** All synchronization functionalities are consolidated into `sync.ts`, eliminating redundant files.
-   **Caching Strategy:** React Query is configured with a `staleTime` of 5 minutes and `gcTime` of 30 minutes for efficient client-side caching.
-   **Database Versioning:** IndexedDB uses `DB_VERSION = 7`.
-   **APK Naming:** Android build is configured to generate APK with versioning (e.g., `BinarJoin-v1.0.27.apk`).
-   **Version Tracking:** Synced with `package.json` versioning (currently 1.0.27).

## External Dependencies

-   **Database:** PostgreSQL (primary server-side database).
-   **Local Storage:** IndexedDB (for client-side data mirroring).
-   **Frontend Framework:** React.js.
-   **State Management/Caching:** React Query.
-   **Backend Framework:** Express.js (for the API server).