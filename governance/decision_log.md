# Decision Log

## [2026-02-25] - Standard Selection
- **Decision**: Use OpenTelemetry as the primary observability standard.
- **Rationale**: High industry adoption, vendor neutrality, and robust SDK support for Node.js and React.
- **Status**: IMPLEMENTED

## [2026-02-25] - Multi-Agent Governance
- **Decision**: Implement a file-based locking mechanism in `task_board.json`.
- **Rationale**: Prevents race conditions and duplicate work when multiple agents (or sessions) are active.
- **Status**: ACTIVE
