# Task Definition: Backend Instrumentation (BACK-001)

## Overview
Integrate OpenTelemetry (OTLP) tracing into the Node.js Express server to enable full-stack observability.

## Mandatory Instructions
1. **SDK Initialization**: Must be loaded at the very first line of the application entry point using `require('./instrumentation.js')`.
2. **Resource Naming**: Use `process.env.OTEL_SERVICE_NAME` or default to `main-backend`.
3. **Exporter Configuration**: Use OTLP/HTTP exporter pointing to `http://localhost:4318/v1/traces`.
4. **Auto-Instrumentation**: Enable `getNodeAutoInstrumentations()` to capture HTTP, Express, and Database traces automatically.

## Constraints
- **Performance**: Instrumentation must not introduce more than 5ms of latency to request handling.
- **Safety**: SDK shutdown must be handled on `SIGTERM` to ensure all spans are flushed.
- **No Mocking**: Use real OTLP exporters; do not use `ConsoleSpanExporter` in production-like environments.

## Acceptance Criteria
- [ ] Server starts without errors with `node -r ./instrumentation.js server/index.ts`.
- [ ] Traces are visible in the collector logs or backend storage (e.g., SigNoz).
- [ ] `traceparent` headers are correctly propagated to downstream services.
