import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDashboard, updateDashboard, fetchMetricRangeQuery } from "@/lib/api-client";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { timeRangeToParams } from "@/lib/utils";

interface Widget {
  id: string;
  title: string;
  type: string;
  query: string;
  queryType: string;
  layout: { x: number; y: number; w: number; h: number };
}

interface DashboardData {
  id: string;
  title: string;
  description: string;
  widgets: Widget[];
}

function WidgetCard({ widget, timeRange }: { widget: Widget; timeRange: string }) {
  const { from, to } = timeRangeToParams(timeRange);

  const { data, isLoading } = useQuery({
    queryKey: ["widget-data", widget.id, widget.query, from, to],
    queryFn: () =>
      fetchMetricRangeQuery({
        query: widget.query,
        start: from,
        end: to,
        step: "60",
      }),
    enabled: widget.queryType === "metric" && !!widget.query,
  });

  const chartData = (() => {
    const result = data as {
      data?: { result?: Array<{ values: Array<[number, string]> }> };
    };
    const series = result?.data?.result ?? [];
    if (series.length === 0) return [];
    return (series[0]?.values ?? []).map(([ts, val]) => ({
      timestamp: new Date(ts * 1000).toISOString(),
      value: parseFloat(val),
    }));
  })();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{widget.title}</h3>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          Loading...
        </div>
      ) : chartData.length > 0 ? (
        <TimeSeriesChart data={chartData} dataKey="value" height={200} />
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No data for query: {widget.query}
        </div>
      )}
    </div>
  );
}

export default function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("1h");
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [newWidget, setNewWidget] = useState({ title: "", query: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchDashboard(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (widgets: Widget[]) =>
      updateDashboard(id!, { widgets }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dashboard", id] }),
  });

  const dashboard = data as DashboardData | undefined;

  const addWidget = () => {
    if (!dashboard || !newWidget.title || !newWidget.query) return;
    const widget: Widget = {
      id: crypto.randomUUID(),
      title: newWidget.title,
      type: "timeseries",
      query: newWidget.query,
      queryType: "metric",
      layout: {
        x: 0,
        y: dashboard.widgets.length,
        w: 6,
        h: 3,
      },
    };
    updateMutation.mutate([...dashboard.widgets, widget]);
    setNewWidget({ title: "", query: "" });
    setShowAddWidget(false);
  };

  const TIME_RANGES = ["15m", "1h", "6h", "24h", "7d"];

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboards")}
            className="text-gray-400 hover:text-gray-200 text-sm"
          >
            &larr; Back
          </button>
          <h2 className="text-lg font-semibold">
            {dashboard?.title ?? "Loading..."}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAddWidget(true)}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600"
          >
            + Add Widget
          </button>
          <div className="flex rounded-md border border-gray-700 overflow-hidden">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-brand-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {showAddWidget && (
          <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Add Widget
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWidget.title}
                onChange={(e) =>
                  setNewWidget((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Widget title..."
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm w-48"
              />
              <input
                type="text"
                value={newWidget.query}
                onChange={(e) =>
                  setNewWidget((p) => ({ ...p, query: e.target.value }))
                }
                placeholder="PromQL query..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 font-mono text-sm"
              />
              <button
                onClick={addWidget}
                className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddWidget(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading dashboard...
          </div>
        ) : !dashboard?.widgets?.length ? (
          <div className="p-8 text-center text-gray-500">
            No widgets yet. Click "+ Add Widget" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard.widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                timeRange={timeRange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
