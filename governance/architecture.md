# Architecture & Standards

## 1. Multi-Agent Governance
All agents must follow the `task_board.json` locking mechanism. No direct edits to `main` without PR and task assignment.

## 2. Observability Stack
- **Collection**: OpenTelemetry (OTLP)
- **Processing**: Central Collector -> Kafka (Optional/Planned)
- **Backend**: Prometheus (Metrics), Elasticsearch (Logs), Jaeger/Tempo (Traces)
- **Frontend**: Grafana

## 3. Instrumentation Policy
- Every service must include `instrumentation.js`.
- Trace context must be propagated via W3C Trace Context headers.