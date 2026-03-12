import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { fetchMetricRangeQuery } from "@/lib/api-client";
import { timeRangeToParams } from "@/lib/utils";

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState("1h");
  const [query, setQuery] = useState("up");
  const [submittedQuery, setSubmittedQuery] = useState("up");

  const { from, to } = timeRangeToParams(timeRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["metrics-range", submittedQuery, from, to],
    queryFn: () =>
      fetchMetricRangeQuery({
        query: submittedQuery,
        start: from,
        end: to,
        step: "60",
      }),
    enabled: !!submittedQuery,
  });

  // Transform VictoriaMetrics response to chart-friendly format
  const chartData = (() => {
    const result = data as {
      data?: { result?: Array<{ metric: Record<string, string>; values: Array<[number, string]> }> };
    };
    const series = result?.data?.result ?? [];
    if (series.length === 0) return [];

    // Use the first series for now
    return (series[0]?.values ?? []).map(([ts, val]) => ({
      timestamp: new Date(ts * 1000).toISOString(),
      value: parseFloat(val),
    }));
  })();

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Metrics Explorer"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      <div className="p-4 border-b border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQuery(query);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter PromQL query..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 font-mono text-sm placeholder-gray-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors"
          >
            Run Query
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Running query...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            Query error: {(error as Error).message}
          </div>
        ) : chartData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No data. Try a different query or time range.
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-sm text-gray-400 mb-4 font-mono">
              {submittedQuery}
            </h3>
            <TimeSeriesChart data={chartData} dataKey="value" xKey="timestamp" />
          </div>
        )}
      </div>
    </div>
  );
}
