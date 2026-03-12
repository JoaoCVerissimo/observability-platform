import "dotenv/config";

export const config = {
  port: parseInt(process.env.INGEST_SERVICE_PORT ?? "4400", 10),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
    clientId: "obs-ingest",
  },
  clickhouse: {
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    database: process.env.CLICKHOUSE_DB ?? "observability",
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  },
  victoriametrics: {
    url: process.env.VICTORIA_METRICS_URL ?? "http://localhost:8428",
  },
} as const;
