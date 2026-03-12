import type { FastifyInstance } from "fastify";
import { createClient } from "@clickhouse/client";
import { config } from "../config.js";

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  // List currently firing alerts
  app.get("/api/v1/alerts", async () => {
    const ch = createClient({
      url: config.clickhouse.url,
      database: config.clickhouse.database,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
    });

    const result = await ch.query({
      query: `
        SELECT
          ae.rule_id,
          ar.name AS rule_name,
          ar.severity,
          ae.fired_at,
          ae.value,
          ae.labels
        FROM alert_events ae
        JOIN alert_rules ar ON ae.rule_id = ar.id
        WHERE ae.status = 'firing'
          AND ae.fired_at >= now() - INTERVAL 1 DAY
        ORDER BY ae.fired_at DESC
        LIMIT 100
      `,
      format: "JSONEachRow",
    });

    const rows = await result.json();
    await ch.close();
    return { data: rows };
  });
}
