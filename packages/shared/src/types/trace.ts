export type SpanKind = "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
export type SpanStatusCode = "UNSET" | "OK" | "ERROR";

export interface SpanEvent {
  timestamp: string;
  name: string;
  attributes: Record<string, string>;
}

export interface Span {
  timestamp: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  spanKind: SpanKind;
  durationNs: number;
  statusCode: SpanStatusCode;
  statusMessage?: string;
  attributes: Record<string, string>;
  events: SpanEvent[];
  resource?: Record<string, string>;
}

export interface TraceQueryParams {
  from: string;
  to: string;
  service?: string;
  operation?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  status?: SpanStatusCode;
  limit?: number;
  offset?: number;
}

export interface TraceSummary {
  traceId: string;
  rootServiceName: string;
  rootOperationName: string;
  startTime: string;
  durationMs: number;
  spanCount: number;
  errorCount: number;
  services: string[];
}
