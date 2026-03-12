import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/header";
import { fetchTraces } from "@/lib/api-client";
import { timeRangeToParams, formatDuration, cn } from "@/lib/utils";

export default function TracesPage() {
  const [timeRange, setTimeRange] = useState("1h");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const { from, to } = timeRangeToParams(timeRange);

  const params: Record<string, string> = { from, to, limit: "100" };
  if (service) params.service = service;
  if (status) params.status = status;

  const { data, isLoading } = useQuery({
    queryKey: ["traces", params],
    queryFn: () => fetchTraces(params),
  });

  const traces = (data?.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="flex flex-col h-full">
      <Header title="Trace Explorer" timeRange={timeRange} onTimeRangeChange={setTimeRange}>
        <input
          type="text"
          placeholder="Service..."
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 w-36"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-300"
        >
          <option value="">All Status</option>
          <option value="OK">OK</option>
          <option value="ERROR">ERROR</option>
        </select>
      </Header>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading traces...</div>
        ) : traces.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No traces found. Make sure infrastructure is running and data is being ingested.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2">Trace ID</th>
                <th className="px-4 py-2">Root Service</th>
                <th className="px-4 py-2">Root Operation</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Spans</th>
                <th className="px-4 py-2">Errors</th>
                <th className="px-4 py-2">Services</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => navigate(`/traces/${trace.traceId}`)}
                >
                  <td className="px-4 py-2 font-mono text-xs text-brand-400">
                    {String(trace.traceId).slice(0, 16)}...
                  </td>
                  <td className="px-4 py-2 text-gray-300">
                    {String(trace.rootServiceName)}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {String(trace.rootOperationName)}
                  </td>
                  <td className="px-4 py-2 text-gray-300">
                    {formatDuration(Number(trace.durationMs))}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {String(trace.spanCount)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2",
                      Number(trace.errorCount) > 0
                        ? "text-red-400"
                        : "text-gray-500"
                    )}
                  >
                    {String(trace.errorCount)}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">
                    {Array.isArray(trace.services)
                      ? (trace.services as string[]).join(", ")
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
