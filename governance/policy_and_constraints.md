# Multi-Agent Coordination Policy

## 1. Task Lifecycle
- **ASSIGNED**: Task added to `task_board.json` with an assigned Agent-ID.
- **IN_PROGRESS**: Agent creates a branch and starts working. `locked_files` must be respected.
- **REVIEW**: Pull Request opened. `Agent-Reviewer` or `Agent-Architect` must approve.
- **DONE**: Merged to main and status updated in `task_board.json`.

## 2. Mandatory File Updates
Before any PR merge, the agent MUST update:
1. `governance/change_log.md`: Detail the technical changes.
2. `governance/task_board.json`: Update status to `DONE`.
3. `governance/decision_log.md`: If any architectural decisions were made.

## 3. Locking Constraints
- No agent may modify a file listed in another task's `locked_files` if that task is `IN_PROGRESS`.
- Global files like `shared/schema.ts` require an `ARCH` level task and multi-agent consensus.

## 4. Communication
- Use `governance/handoff_notes.md` for asynchronous handovers between agents.
