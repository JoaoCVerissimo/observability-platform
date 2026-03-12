export type AlertQueryType = "metric" | "log" | "trace";
export type AlertCondition = "gt" | "lt" | "eq" | "gte" | "lte";
export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "firing" | "pending" | "resolved";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  queryType: AlertQueryType;
  query: string;
  condition: AlertCondition;
  threshold: number;
  evaluationIntervalS: number;
  forDurationS: number;
  severity: AlertSeverity;
  labels: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  queryType: AlertQueryType;
  query: string;
  condition: AlertCondition;
  threshold: number;
  evaluationIntervalS?: number;
  forDurationS?: number;
  severity: AlertSeverity;
  labels?: Record<string, string>;
  enabled?: boolean;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  firedAt: string;
  resolvedAt: string | null;
  status: AlertStatus;
  value: number;
  labels: Record<string, string>;
}
