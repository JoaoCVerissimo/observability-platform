import type { FastifyInstance } from "fastify";
import { getClickHouse, buildWhereClause } from "../services/clickhouse.js";
import { safeLimit, safeOffset } from "@obs/shared";

interface TraceQuerystring {
  from: string;
  to: string;
  service?: string;
  operation?: string;
  minDurationMs?: string;
  maxDurationMs?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

interface TraceParams {
  traceId: string;
}

export async function traceRoutes(app: FastifyInstance): Promise<void> {
  // List traces (returns summaries)
  app.get<{ Querystring: TraceQuerystring }>(
    "/api/v1/traces",
    async (request, reply) => {
      const { from, to, service, operation, status } = request.query;

      if (!from || !to) {
        return reply.status(400).send({ error: "from and to are required" });
      }

      const limit = safeLimit(request.query.limit);
      const offset = safeOffset(request.query.offset);

      const filters = [
        { column: "service_name", param: "service", value: service },
        { column: "operation_name", param: "operation", value: operation },
        { column: "status_code", param: "status", value: status },
      ];

      const { where, params } = buildWhereClause(filters, "timestamp", from, to);

      let fullWhere = where;

      if (request.query.minDurationMs) {
        const minNs = parseInt(request.query.minDurationMs, 10) * 1_000_000;
        fullWhere += ` AND duration_ns >= {minDuration:UInt64}`;
        params.minDuration = minNs;
      }
      if (request.query.maxDurationMs) {
        const maxNs = parseInt(request.query.maxDurationMs, 10) * 1_000_000;
        fullWhere += ` AND duration_ns <= {maxDuration:UInt64}`;
        params.maxDuration = maxNs;
      }

      const ch = getClickHouse();

      // Get trace summaries by grouping spans by trace_id
      const result = await ch.query({
        query: `
          SELECT
            trace_id,
            min(timestamp) AS start_time,
            max(duration_ns) AS duration_ns,
            count() AS span_count,
            countIf(status_code = 'ERROR') AS error_count,
            groupUniqArray(service_name) AS services,
            argMin(service_name, timestamp) AS root_service,
            argMin(operation_name, timestamp) AS root_operation
          FROM traces
          WHERE ${fullWhere}
          GROUP BY trace_id
          ORDER BY start_time DESC
          LIMIT {limit:UInt32} OFFSET {offset:UInt32}
        `,
        query_params: { ...params, limit, offset },
        format: "JSONEachRow",
      });

      const rows = (await result.json()) as Record<string, unknown>[];

      const data = rows.map((row) => ({
        traceId: row.trace_id,
        rootServiceName: row.root_service,
        rootOperationName: row.root_operation,
        startTime: row.start_time,
        durationMs: Number(row.duration_ns) / 1_000_000,
        spanCount: Number(row.span_count),
        errorCount: Number(row.error_count),
        services: row.services,
      }));

      return { data, limit, offset };
    }
  );

  // Get all spans for a specific trace
  app.get<{ Params: TraceParams }>(
    "/api/v1/traces/:traceId",
    async (request, reply) => {
      const { traceId } = request.params;

      const ch = getClickHouse();
      const result = await ch.query({
        query: `
          SELECT *
          FROM traces
          WHERE trace_id = {traceId:String}
          ORDER BY timestamp ASC
        `,
        query_params: { traceId },
        format: "JSONEachRow",
      });

      const rows = (await result.json()) as Record<string, unknown>[];

      if (rows.length === 0) {
        return reply.status(404).send({ error: "Trace not found" });
      }

      const spans = rows.map((row) => ({
        timestamp: row.timestamp,
        traceId: row.trace_id,
        spanId: row.span_id,
        parentSpanId: row.parent_span_id || undefined,
        serviceName: row.service_name,
        operationName: row.operation_name,
        spanKind: row.span_kind,
        durationNs: Number(row.duration_ns),
        statusCode: row.status_code,
        statusMessage: row.status_message || undefined,
        attributes: row.attributes,
        resource: row.resource,
      }));

      return { traceId, spans };
    }
  );
}
