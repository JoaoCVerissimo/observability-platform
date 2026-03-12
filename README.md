# ObsLens — Developer Observability Platform

A local-first, open-source observability platform inspired by Datadog. Collect logs, metrics, and distributed traces from your applications with a simple SDK, then explore them through a React dashboard.

## Architecture

```
Applications (with @obs/sdk)
    │ OTLP gRPC/HTTP
    ▼
OpenTelemetry Collector (gateway)
    │
    ├──► Redpanda (Kafka-compatible) ──► Consumer ──► ClickHouse (logs + traces)
    │
    └──► VictoriaMetrics (metrics via Prometheus remote-write)

Query Service (Fastify) ◄── reads from ClickHouse + VictoriaMetrics
Alert Service (Fastify) ◄── evaluates rules against storage
React Dashboard (Vite)  ◄── calls Query + Alert APIs
```

### How the Observability Pipeline Works

1. **Collection**: Applications use `@obs/sdk` (a thin wrapper around OpenTelemetry) to emit logs, metrics, and traces. Auto-instrumentation captures HTTP, database, and framework calls automatically.

2. **Transport**: Telemetry data is sent via OTLP (gRPC) to the **OpenTelemetry Collector**, which acts as a central gateway. The collector batches, processes, and routes data.

3. **Buffering**: The collector exports data to **Redpanda** (Kafka-compatible message broker) for durability. Metrics are additionally sent directly to VictoriaMetrics via Prometheus remote-write for real-time queries.

4. **Storage**: A consumer service reads from Redpanda and batch-inserts into:
   - **ClickHouse** — columnar database for logs and traces (10x compression, fast analytics)
   - **VictoriaMetrics** — purpose-built metrics database (Prometheus-compatible, ~1 byte/datapoint)

5. **Querying**: The Query Service provides a REST API that reads from ClickHouse (logs, traces) and proxies PromQL to VictoriaMetrics (metrics).

6. **Alerting**: The Alert Service evaluates rules on a schedule, checking metric values and log/trace counts against thresholds. Notifications go to webhooks or console.

7. **Visualization**: The React dashboard provides log exploration, trace waterfall views, metric charting, alert management, and custom dashboards.

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Redpanda** over Kafka | Single binary, Kafka-API compatible, lower memory footprint for local dev |
| **ClickHouse** for logs/traces | Columnar storage excels at sparse attributes, 10x compression vs Elasticsearch |
| **VictoriaMetrics** for metrics | Prometheus-compatible, ~70x better compression, low memory |
| **OTel Collector** as hub | Vendor-agnostic, handles batching/sampling/routing, standard protocol |
| **Fastify** for backends | 2x faster than Express, built-in schema validation, TypeScript-first |
| **pnpm + Turborepo** | Fast installs, efficient monorepo task orchestration |

## Tech Stack

- **Backend**: Node.js, TypeScript, Fastify
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **Storage**: ClickHouse (logs/traces), VictoriaMetrics (metrics)
- **Message Bus**: Redpanda (Kafka-compatible)
- **Telemetry**: OpenTelemetry Collector + SDK
- **Infrastructure**: Docker Compose
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
observability-platform/
├── apps/
│   ├── web/              # React dashboard
│   ├── query-service/    # REST API for querying data
│   ├── alert-service/    # Alert rule evaluation + notifications
│   ├── ingest-service/   # Data ingestion + Kafka→ClickHouse consumer
│   └── demo-app/         # Sample app with load generator
├── packages/
│   ├── sdk/              # @obs/sdk — OpenTelemetry wrapper
│   └── shared/           # Shared TypeScript types
├── infra/                # OTel Collector config, ClickHouse schema
├── docker-compose.yml    # Full stack
└── docker-compose.dev.yml # Infrastructure only
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
make infra
```

This starts Redpanda, ClickHouse, VictoriaMetrics, and the OTel Collector.

### 3. Start all services in dev mode

```bash
make dev
```

### 4. Run the demo app + load generator

In separate terminals:

```bash
# Start the demo app
make demo

# Generate traffic
pnpm --filter @obs/demo-app load
```

### 5. Open the dashboard

Visit [http://localhost:3000](http://localhost:3000) to explore:

- **Logs** — Search and filter log records
- **Traces** — View distributed traces with waterfall visualization
- **Metrics** — Run PromQL queries with time-series charts
- **Alerts** — Create and manage alert rules
- **Dashboards** — Build custom dashboards with widgets

## Full Stack (Docker)

To run everything in Docker (no local Node.js needed):

```bash
docker compose up --build
```

## Using the SDK

Add `@obs/sdk` to your application:

```typescript
import { init, logger, metrics, tracer } from "@obs/sdk";

// Initialize once at startup
init({
  serviceName: "my-service",
  endpoint: "http://localhost:4317",
});

// Structured logging (auto-correlates with traces)
logger.info("User logged in", { userId: "123" });

// Metrics
const counter = metrics.counter("requests.total");
counter.add(1, { method: "GET" });

// Manual tracing (most instrumentation is automatic)
await tracer.withSpan("process-order", async (span) => {
  span.setAttributes({ "order.id": "456" });
  // ... business logic
});
```

## API Reference

### Query Service (port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/logs` | Search logs |
| GET | `/api/v1/logs/aggregate` | Log histogram |
| GET | `/api/v1/traces` | Search traces |
| GET | `/api/v1/traces/:traceId` | Get full trace |
| GET | `/api/v1/metrics/query` | PromQL instant query |
| GET | `/api/v1/metrics/query_range` | PromQL range query |
| CRUD | `/api/v1/dashboards` | Dashboard management |

### Alert Service (port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/v1/rules` | Alert rule management |
| GET | `/api/v1/alerts` | Currently firing alerts |
| GET | `/api/v1/rules/:id/history` | Alert event history |

## Development

```bash
# Typecheck all packages
make typecheck

# Run tests
make test

# Stop infrastructure
make infra-down

# Full reset (removes all data)
make reset
```

## License

MIT
