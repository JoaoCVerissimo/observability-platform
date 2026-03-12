import { config } from "../config.js";

const VM_URL = config.victoriametrics.url;

/**
 * Proxy a PromQL instant query to VictoriaMetrics.
 */
export async function queryInstant(
  query: string,
  time?: string
): Promise<unknown> {
  const params = new URLSearchParams({ query });
  if (time) params.set("time", time);

  const res = await fetch(`${VM_URL}/api/v1/query?${params}`);
  if (!res.ok) {
    throw new Error(
      `VictoriaMetrics query failed: ${res.status} ${await res.text()}`
    );
  }
  return res.json();
}

/**
 * Proxy a PromQL range query to VictoriaMetrics.
 */
export async function queryRange(
  query: string,
  start: string,
  end: string,
  step?: string
): Promise<unknown> {
  const params = new URLSearchParams({ query, start, end });
  if (step) params.set("step", step);

  const res = await fetch(`${VM_URL}/api/v1/query_range?${params}`);
  if (!res.ok) {
    throw new Error(
      `VictoriaMetrics range query failed: ${res.status} ${await res.text()}`
    );
  }
  return res.json();
}

/**
 * Get label names from VictoriaMetrics.
 */
export async function getLabels(): Promise<unknown> {
  const res = await fetch(`${VM_URL}/api/v1/labels`);
  if (!res.ok) {
    throw new Error(`VictoriaMetrics labels failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get label values for a specific label.
 */
export async function getLabelValues(label: string): Promise<unknown> {
  const res = await fetch(`${VM_URL}/api/v1/label/${encodeURIComponent(label)}/values`);
  if (!res.ok) {
    throw new Error(`VictoriaMetrics label values failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get metric series matching selectors.
 */
export async function getSeries(
  match: string[],
  start?: string,
  end?: string
): Promise<unknown> {
  const params = new URLSearchParams();
  for (const m of match) params.append("match[]", m);
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  const res = await fetch(`${VM_URL}/api/v1/series?${params}`);
  if (!res.ok) {
    throw new Error(`VictoriaMetrics series failed: ${res.status}`);
  }
  return res.json();
}
