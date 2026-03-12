import type { FastifyInstance } from "fastify";
import { getClickHouse, buildWhereClause } from "../services/clickhouse.js";
import { safeLimit, safeOffset } from "@obs/shared";

interface LogQuerystring {
  from: string;
  to: string;
  service?: string;
  severity?: string;
  query?: string;
  limit?: string;
  offset?: string;
  order?: "asc" | "desc";
}

interface LogAggregateQuerystring {
  from: string;
  to: string;
  service?: string;
  severity?: string;
  query?: string;
  interval?: string;
}

export async function logRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: LogQuerystring }>(
    "/api/v1/logs",
    async (request, reply) => {
      const { from, to, service, severity, query: searchQuery, order } = request.query;

      if (!from || !to) {
        return reply.status(400).send({ error: "from and to are required" });
      }

      const limit = safeLimit(request.query.limit);
      const offset = safeOffset(request.query.offset);

      const filters = [
        { column: "service_name", param: "service", value: service },
        { column: "severity", param: "severity", value: severity },
      ];

      const { where, params } = buildWhereClause(filters, "timestamp", from, to);

      let fullWhere = where;
      if (searchQuery) {
        fullWhere += " AND body ILIKE {search:String}";
        params.search = `%${searchQuery}%`;
      }

      const sortOrder = order === "asc" ? "ASC" : "DESC";

      const ch = getClickHouse();
      const result = await ch.query({
        query: `SELECT * FROM logs WHERE ${fullWhere} ORDER BY timestamp ${sortOrder} LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
        query_params: { ...params, limit, offset },
        format: "JSONEachRow",
      });

      const rows = await result.json();
      return { data: rows, limit, offset };
    }
  );

  app.get<{ Querystring: LogAggregateQuerystring }>(
    "/api/v1/logs/aggregate",
    async (request, reply) => {
      const { from, to, service, severity, query: searchQuery, interval } = request.query;

      if (!from || !to) {
        return reply.status(400).send({ error: "from and to are required" });
      }

      const bucketInterval = interval ?? "1 MINUTE";

      const filters = [
        { column: "service_name", param: "service", value: service },
        { column: "severity", param: "severity", value: severity },
      ];

      const { where, params } = buildWhereClause(filters, "timestamp", from, to);

      let fullWhere = where;
      if (searchQuery) {
        fullWhere += " AND body ILIKE {search:String}";
        params.search = `%${searchQuery}%`;
      }

      const ch = getClickHouse();
      const result = await ch.query({
        query: `
          SELECT
            toStartOfInterval(timestamp, INTERVAL ${bucketInterval}) AS bucket,
            count() AS count
          FROM logs
          WHERE ${fullWhere}
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        query_params: params,
        format: "JSONEachRow",
      });

      const rows = await result.json();
      return { data: rows };
    }
  );
}
