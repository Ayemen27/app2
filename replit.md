# Project Analysis & Professional Standards Alignment

## 1. Professional AI Agent Standards (User Mandated)
I am committed to the following standards:
- **Analytical Thinking**: Step-by-step reasoning before any response.
- **Accuracy over Speed**: No fabrication or uncertain answers without explicit declaration.
- **Directness**: Presenting reality as it is, without flattery or evasion.
- **Innovative Problem Solving**: Proposing non-traditional yet realistic solutions when standard ones fail.

## 2. Step-by-Step Analytical Thinking (Current State)
The project is a sophisticated hybrid Mobile/Web application using React (Vite) and Express (Node.js). 

### Architecture Evaluation:
- **Backend**: Modular routes in `server/routes/modules/`. Drizzle ORM with PostgreSQL.
- **Frontend**: TanStack Query + wouter. Offline-first with vector clocks.
- **Integrity Status**: Monitoring and Security services are present but need tighter UI integration for "Real-time Truth".

## 3. Decision Logic & Justification
- **Standard Alignment**: To meet the "Reality as it is" requirement, the system must expose its internal health metrics directly to the admin.
- **Decision**: Prioritize the `SystemCheckPage` and `DataHealthPage` as the "Source of Truth" for the user.

## 4. Implementation Status & Plans
- **Audit**: `shared/schema.ts` is robust. `App.tsx` routing is correct.
- **AIOps Initialization**: Phase 0 & 1 governance structure implemented.
- **Observability**: `instrumentation.js` and `otel-collector-config.yaml` created.
- **Task Tracking**: `governance/task_board.json` active for multi-agent coordination.

## 5. Multi-Agent Governance (Active)
- **Policy**: All changes must be logged in `change_log.md` and `task_board.json`.
- **Architect**: Replit Agent (acting as Lead).

---
*Status: Operating under Professional Standards. Evaluation Complete.*

