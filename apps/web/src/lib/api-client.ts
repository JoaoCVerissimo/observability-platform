const API_BASE = "/api/v1";
const ALERT_API_BASE = "/alert-api/v1";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Logs
export function fetchLogs(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<{ data: unknown[]; limit: number; offset: number }>(
    `${API_BASE}/logs?${qs}`
  );
}

export function fetchLogAggregate(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<{ data: Array<{ bucket: string; count: number }> }>(
    `${API_BASE}/logs/aggregate?${qs}`
  );
}

// Traces
export function fetchTraces(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<{ data: unknown[]; limit: number; offset: number }>(
    `${API_BASE}/traces?${qs}`
  );
}

export function fetchTrace(traceId: string) {
  return request<{ traceId: string; spans: unknown[] }>(
    `${API_BASE}/traces/${traceId}`
  );
}

// Metrics
export function fetchMetricQuery(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<unknown>(`${API_BASE}/metrics/query?${qs}`);
}

export function fetchMetricRangeQuery(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<unknown>(`${API_BASE}/metrics/query_range?${qs}`);
}

export function fetchMetricLabels() {
  return request<{ data: string[] }>(`${API_BASE}/metrics/labels`);
}

// Dashboards
export function fetchDashboards() {
  return request<{ data: unknown[] }>(`${API_BASE}/dashboards`);
}

export function fetchDashboard(id: string) {
  return request<unknown>(`${API_BASE}/dashboards/${id}`);
}

export function createDashboard(body: unknown) {
  return request<unknown>(`${API_BASE}/dashboards`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDashboard(id: string, body: unknown) {
  return request<unknown>(`${API_BASE}/dashboards/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDashboard(id: string) {
  return request<void>(`${API_BASE}/dashboards/${id}`, { method: "DELETE" });
}

// Alert Rules
export function fetchAlertRules() {
  return request<{ data: unknown[] }>(`${ALERT_API_BASE}/rules`);
}

export function fetchAlertRule(id: string) {
  return request<unknown>(`${ALERT_API_BASE}/rules/${id}`);
}

export function createAlertRule(body: unknown) {
  return request<unknown>(`${ALERT_API_BASE}/rules`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAlertRule(id: string, body: unknown) {
  return request<unknown>(`${ALERT_API_BASE}/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAlertRule(id: string) {
  return request<void>(`${ALERT_API_BASE}/rules/${id}`, { method: "DELETE" });
}

export function fetchFiringAlerts() {
  return request<{ data: unknown[] }>(`${ALERT_API_BASE}/alerts`);
}

export function fetchAlertHistory(ruleId: string) {
  return request<{ data: unknown[] }>(`${ALERT_API_BASE}/rules/${ruleId}/history`);
}
