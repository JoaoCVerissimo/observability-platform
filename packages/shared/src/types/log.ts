export type SeverityLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogRecord {
  timestamp: string;
  traceId?: string;
  spanId?: string;
  severity: SeverityLevel;
  serviceName: string;
  body: string;
  attributes: Record<string, string>;
  resource?: Record<string, string>;
}

export interface LogQueryParams {
  from: string;
  to: string;
  service?: string;
  severity?: SeverityLevel;
  query?: string;
  attributes?: Record<string, string>;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

export interface LogAggregateParams {
  from: string;
  to: string;
  service?: string;
  severity?: SeverityLevel;
  query?: string;
  interval?: string;
}

export interface LogAggregateResult {
  timestamp: string;
  count: number;
}
