import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BarChart } from "@/components/charts/bar-chart";
import { fetchLogs, fetchLogAggregate } from "@/lib/api-client";
import { timeRangeToParams, cn, formatTimestamp } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  DEBUG: "text-gray-400",
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  FATAL: "text-red-600 font-bold",
};

export default function LogsPage() {
  const [timeRange, setTimeRange] = useState("1h");
  const [service, setService] = useState("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { from, to } = timeRangeToParams(timeRange);

  const params: Record<string, string> = { from, to, limit: "200" };
  if (service) params.service = service;
  if (severity) params.severity = severity;
  if (search) params.query = search;

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", params],
    queryFn: () => fetchLogs(params),
  });

  const { data: aggregateData } = useQuery({
    queryKey: ["logs-aggregate", { from, to, service, severity }],
    queryFn: () =>
      fetchLogAggregate({
        from,
        to,
        ...(service && { service }),
        ...(severity && { severity }),
      }),
  });

  const logs = (logsData?.data ?? []) as Array<Record<string, unknown>>;
  const histogram = (aggregateData?.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="flex flex-col h-full">
      <Header title="Log Explorer" timeRange={timeRange} onTimeRangeChange={setTimeRange}>
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 w-64"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-300"
        >
          <option value="">All Levels</option>
          <option value="DEBUG">DEBUG</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
          <option value="FATAL">FATAL</option>
        </select>
        <input
          type="text"
          placeholder="Service..."
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 w-36"
        />
      </Header>

      {/* Histogram */}
      {histogram.length > 0 && (
        <div className="p-4 border-b border-gray-800">
          <BarChart data={histogram} dataKey="count" xKey="bucket" height={120} />
        </div>
      )}

      {/* Log table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found. Make sure infrastructure is running and data is being ingested.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2 w-36">Timestamp</th>
                <th className="px-4 py-2 w-16">Level</th>
                <th className="px-4 py-2 w-36">Service</th>
                <th className="px-4 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                >
                  <td className="px-4 py-1.5 text-gray-500 font-mono text-xs">
                    {formatTimestamp(String(log.timestamp))}
                  </td>
                  <td className={cn("px-4 py-1.5 text-xs font-medium", SEVERITY_COLORS[String(log.severity)] ?? "text-gray-400")}>
                    {String(log.severity)}
                  </td>
                  <td className="px-4 py-1.5 text-gray-400 text-xs">
                    {String(log.service_name)}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-gray-300 truncate max-w-xl">
                    {String(log.body)}
                    {expandedRow === i && log.attributes != null && (
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400">
                        <pre>{JSON.stringify(log.attributes as Record<string, unknown>, null, 2)}</pre>
                      </div>
                    )}
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
