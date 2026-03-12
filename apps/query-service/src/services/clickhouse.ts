import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { config } from "../config.js";

let client: ClickHouseClient | null = null;

export function getClickHouse(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: config.clickhouse.url,
      database: config.clickhouse.database,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
    });
  }
  return client;
}

/**
 * Build a WHERE clause from optional filter parameters.
 * Uses parameterized queries to prevent injection.
 */
export function buildWhereClause(
  filters: Array<{
    column: string;
    param: string;
    value: string | number | undefined;
    op?: string;
  }>,
  timeColumn: string,
  from: string,
  to: string
): { where: string; params: Record<string, string | number> } {
  const conditions: string[] = [
    `${timeColumn} >= {from:String}`,
    `${timeColumn} <= {to:String}`,
  ];
  const params: Record<string, string | number> = { from, to };

  for (const filter of filters) {
    if (filter.value !== undefined && filter.value !== "") {
      const op = filter.op ?? "=";
      conditions.push(`${filter.column} ${op} {${filter.param}:String}`);
      params[filter.param] = filter.value;
    }
  }

  return { where: conditions.join(" AND "), params };
}
