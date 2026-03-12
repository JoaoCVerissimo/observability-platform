export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export interface MetricDataPoint {
  name: string;
  type: MetricType;
  timestamp: number;
  value: number;
  attributes: Record<string, string>;
}

export interface MetricQueryParams {
  query: string;
  time?: string;
}

export interface MetricRangeQueryParams {
  query: string;
  start: string;
  end: string;
  step?: string;
}

export interface MetricResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export interface MetricQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: MetricResult[];
  };
}
