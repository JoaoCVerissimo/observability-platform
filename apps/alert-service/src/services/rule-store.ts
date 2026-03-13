import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { config } from "../config.js";
import type { AlertRule, CreateAlertRuleInput } from "@obs/shared";

let client: ClickHouseClient | null = null;

function toClickHouseDateTime(iso?: string): string {
  const s = iso ?? new Date().toISOString();
  return s.replace("T", " ").replace("Z", "").replace(/\.\d+$/, "");
}

function nowClickHouse(): string {
  return toClickHouseDateTime(new Date().toISOString());
}

function getClickHouse(): ClickHouseClient {
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

export async function listRules(): Promise<AlertRule[]> {
  const ch = getClickHouse();
  const result = await ch.query({
    query: "SELECT * FROM alert_rules FINAL ORDER BY created_at DESC",
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Record<string, unknown>[];
  return rows.map(mapRowToRule);
}

export async function getRule(id: string): Promise<AlertRule | null> {
  const ch = getClickHouse();
  const result = await ch.query({
    query: "SELECT * FROM alert_rules FINAL WHERE id = {id:UUID}",
    query_params: { id },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return mapRowToRule(rows[0]);
}

export async function createRule(input: CreateAlertRuleInput): Promise<AlertRule> {
  const ch = getClickHouse();
  const id = crypto.randomUUID();
  const now = nowClickHouse();

  await ch.insert({
    table: "alert_rules",
    values: [
      {
        id,
        name: input.name,
        description: input.description ?? "",
        query_type: input.queryType,
        query: input.query,
        condition: input.condition,
        threshold: input.threshold,
        evaluation_interval_s: input.evaluationIntervalS ?? 60,
        for_duration_s: input.forDurationS ?? 0,
        severity: input.severity,
        labels: input.labels ?? {},
        enabled: input.enabled !== false ? 1 : 0,
        created_at: now,
        updated_at: now,
      },
    ],
    format: "JSONEachRow",
  });

  return {
    id,
    name: input.name,
    description: input.description ?? "",
    queryType: input.queryType,
    query: input.query,
    condition: input.condition,
    threshold: input.threshold,
    evaluationIntervalS: input.evaluationIntervalS ?? 60,
    forDurationS: input.forDurationS ?? 0,
    severity: input.severity,
    labels: input.labels ?? {},
    enabled: input.enabled !== false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRule(
  id: string,
  input: Partial<CreateAlertRuleInput>
): Promise<AlertRule | null> {
  const existing = await getRule(id);
  if (!existing) return null;

  const ch = getClickHouse();
  const now = nowClickHouse();

  const updated = {
    id,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    query_type: input.queryType ?? existing.queryType,
    query: input.query ?? existing.query,
    condition: input.condition ?? existing.condition,
    threshold: input.threshold ?? existing.threshold,
    evaluation_interval_s: input.evaluationIntervalS ?? existing.evaluationIntervalS,
    for_duration_s: input.forDurationS ?? existing.forDurationS,
    severity: input.severity ?? existing.severity,
    labels: input.labels ?? existing.labels,
    enabled: input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 1 : 0),
    created_at: toClickHouseDateTime(existing.createdAt),
    updated_at: now,
  };

  await ch.insert({
    table: "alert_rules",
    values: [updated],
    format: "JSONEachRow",
  });

  return mapRowToRule(updated as unknown as Record<string, unknown>);
}

export async function deleteRule(id: string): Promise<boolean> {
  const ch = getClickHouse();
  await ch.command({
    query: "DELETE FROM alert_rules WHERE id = {id:UUID}",
    query_params: { id },
  });
  return true;
}

export async function insertAlertEvent(event: {
  ruleId: string;
  status: string;
  value: number;
  labels: Record<string, string>;
}): Promise<void> {
  const ch = getClickHouse();
  await ch.insert({
    table: "alert_events",
    values: [
      {
        id: crypto.randomUUID(),
        rule_id: event.ruleId,
        fired_at: nowClickHouse(),
        resolved_at: event.status === "resolved" ? nowClickHouse() : null,
        status: event.status,
        value: event.value,
        labels: event.labels,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function getRuleHistory(ruleId: string, limit = 50): Promise<unknown[]> {
  const ch = getClickHouse();
  const result = await ch.query({
    query: `SELECT * FROM alert_events WHERE rule_id = {ruleId:UUID} ORDER BY fired_at DESC LIMIT {limit:UInt32}`,
    query_params: { ruleId, limit },
    format: "JSONEachRow",
  });
  return result.json();
}

function mapRowToRule(row: Record<string, unknown>): AlertRule {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    queryType: String(row.query_type) as AlertRule["queryType"],
    query: String(row.query),
    condition: String(row.condition) as AlertRule["condition"],
    threshold: Number(row.threshold),
    evaluationIntervalS: Number(row.evaluation_interval_s ?? 60),
    forDurationS: Number(row.for_duration_s ?? 0),
    severity: String(row.severity) as AlertRule["severity"],
    labels: (row.labels as Record<string, string>) ?? {},
    enabled: row.enabled === 1 || row.enabled === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
