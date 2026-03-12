import "dotenv/config";

export const config = {
  port: parseInt(process.env.ALERT_SERVICE_PORT ?? "3002", 10),
  clickhouse: {
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    database: process.env.CLICKHOUSE_DB ?? "observability",
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  },
  victoriametrics: {
    url: process.env.VICTORIA_METRICS_URL ?? "http://localhost:8428",
  },
  webhookUrl: process.env.WEBHOOK_URL ?? "",
} as const;
