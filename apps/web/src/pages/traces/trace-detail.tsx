import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTrace } from "@/lib/api-client";
import { formatDuration, cn } from "@/lib/utils";

interface SpanData {
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  spanKind: string;
  durationNs: number;
  statusCode: string;
  timestamp: string;
  attributes?: Record<string, string>;
}

export default function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["trace", traceId],
    queryFn: () => fetchTrace(traceId!),
    enabled: !!traceId,
  });

  const spans = (data?.spans ?? []) as SpanData[];

  // Calculate waterfall positioning
  const traceStart = spans.length
    ? Math.min(...spans.map((s) => new Date(s.timestamp).getTime()))
    : 0;
  const traceEnd = spans.length
    ? Math.max(
        ...spans.map(
          (s) => new Date(s.timestamp).getTime() + s.durationNs / 1_000_000
        )
      )
    : 0;
  const traceDuration = traceEnd - traceStart || 1;

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center px-6 gap-4">
        <button
          onClick={() => navigate("/traces")}
          className="text-gray-400 hover:text-gray-200 text-sm"
        >
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold">Trace {traceId?.slice(0, 16)}...</h2>
        <span className="text-sm text-gray-500">
          {spans.length} spans &middot; {formatDuration(traceDuration)}
        </span>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading trace...</div>
        ) : spans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Trace not found.</div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="flex text-xs text-gray-500 mb-2">
              <div className="w-64 shrink-0 px-2">Service / Operation</div>
              <div className="flex-1 px-2">Timeline</div>
              <div className="w-24 text-right px-2">Duration</div>
            </div>

            {/* Waterfall rows */}
            {spans.map((span) => {
              const spanStart =
                new Date(span.timestamp).getTime() - traceStart;
              const spanDuration = span.durationNs / 1_000_000;
              const leftPct = (spanStart / traceDuration) * 100;
              const widthPct = Math.max(
                (spanDuration / traceDuration) * 100,
                0.5
              );

              return (
                <div
                  key={span.spanId}
                  className="flex items-center group hover:bg-gray-800/30 rounded"
                >
                  <div className="w-64 shrink-0 px-2 py-1 truncate">
                    <span className="text-xs text-gray-400">
                      {span.serviceName}
                    </span>
                    <span className="text-xs text-gray-600 mx-1">/</span>
                    <span className="text-xs text-gray-300">
                      {span.operationName}
                    </span>
                  </div>
                  <div className="flex-1 px-2 py-1 relative h-6">
                    <div
                      className={cn(
                        "absolute h-4 rounded-sm top-1",
                        span.statusCode === "ERROR"
                          ? "bg-red-500/60"
                          : "bg-brand-500/60"
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: "2px",
                      }}
                    />
                  </div>
                  <div className="w-24 text-right px-2 py-1 text-xs text-gray-400">
                    {formatDuration(spanDuration)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
