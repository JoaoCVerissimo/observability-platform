export type WidgetType = "timeseries" | "bar" | "stat" | "table" | "logs" | "traces";

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  query: string;
  queryType: "metric" | "log" | "trace";
  layout: WidgetLayout;
  options?: Record<string, unknown>;
}

export interface Dashboard {
  id: string;
  title: string;
  description: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardInput {
  title: string;
  description?: string;
  widgets?: Widget[];
}

export interface UpdateDashboardInput {
  title?: string;
  description?: string;
  widgets?: Widget[];
}
