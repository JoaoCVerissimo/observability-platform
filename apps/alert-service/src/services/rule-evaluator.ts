import { config } from "../config.js";
import { listRules, insertAlertEvent } from "./rule-store.js";
import { notify } from "./notifier.js";
import type { AlertRule, AlertCondition } from "@obs/shared";

// Track firing state: ruleId -> { firingsSince, lastValue }
const firingState = new Map<
  string,
  { since: number; lastValue: number }
>();

/**
 * Evaluate all enabled alert rules.
 */
export async function evaluateRules(): Promise<void> {
  const rules = await listRules();
  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    try {
      await evaluateRule(rule);
    } catch (err) {
      console.error(`[evaluator] Error evaluating rule "${rule.name}":`, err);
    }
  }
}

async function evaluateRule(rule: AlertRule): Promise<void> {
  const value = await executeQuery(rule);
  if (value === null) return;

  const conditionMet = checkCondition(value, rule.condition, rule.threshold);

  if (conditionMet) {
    const state = firingState.get(rule.id);
    const now = Date.now();

    if (!state) {
      // Start tracking
      firingState.set(rule.id, { since: now, lastValue: value });
    }

    const firingDuration = state ? (now - state.since) / 1000 : 0;

    // Check if "for" duration is met
    if (firingDuration >= rule.forDurationS) {
      await notify({
        rule,
        status: "firing",
        value,
        timestamp: new Date().toISOString(),
      });
      await insertAlertEvent({
        ruleId: rule.id,
        status: "firing",
        value,
        labels: rule.labels,
      });
    }
  } else {
    // Condition no longer met
    if (firingState.has(rule.id)) {
      firingState.delete(rule.id);
      await notify({
        rule,
        status: "resolved",
        value,
        timestamp: new Date().toISOString(),
      });
      await insertAlertEvent({
        ruleId: rule.id,
        status: "resolved",
        value,
        labels: rule.labels,
      });
    }
  }
}

async function executeQuery(rule: AlertRule): Promise<number | null> {
  if (rule.queryType === "metric") {
    return executeMetricQuery(rule.query);
  }
  // For log/trace queries, execute against ClickHouse via query service
  // Simplified: count matching records
  return executeLogTraceQuery(rule.queryType, rule.query);
}

async function executeMetricQuery(promql: string): Promise<number | null> {
  try {
    const url = `${config.victoriametrics.url}/api/v1/query?query=${encodeURIComponent(promql)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      data?: { result?: Array<{ value?: [number, string] }> };
    };
    const result = data?.data?.result?.[0];
    if (!result?.value) return null;

    return parseFloat(result.value[1]);
  } catch {
    return null;
  }
}

async function executeLogTraceQuery(
  type: string,
  query: string
): Promise<number | null> {
  try {
    const table = type === "log" ? "logs" : "traces";
    // Query is expected to be a ClickHouse WHERE clause fragment
    const url = new URL(`${config.clickhouse.url}`);
    const fullQuery = `SELECT count() as cnt FROM ${table} WHERE ${query} AND timestamp >= now() - INTERVAL 5 MINUTE FORMAT JSON`;

    const res = await fetch(url.toString(), {
      method: "POST",
      body: fullQuery,
      headers: {
        "X-ClickHouse-Database": "observability",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { data?: Array<{ cnt: string }> };
    return data?.data?.[0] ? parseInt(data.data[0].cnt, 10) : null;
  } catch {
    return null;
  }
}

function checkCondition(
  value: number,
  condition: AlertCondition,
  threshold: number
): boolean {
  switch (condition) {
    case "gt":
      return value > threshold;
    case "lt":
      return value < threshold;
    case "eq":
      return value === threshold;
    case "gte":
      return value >= threshold;
    case "lte":
      return value <= threshold;
    default:
      return false;
  }
}
