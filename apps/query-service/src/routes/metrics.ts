import type { FastifyInstance } from "fastify";
import * as vm from "../services/victoria-metrics.js";

export async function metricRoutes(app: FastifyInstance): Promise<void> {
  // PromQL instant query
  app.get<{ Querystring: { query: string; time?: string } }>(
    "/api/v1/metrics/query",
    async (request, reply) => {
      const { query, time } = request.query;
      if (!query) {
        return reply.status(400).send({ error: "query is required" });
      }
      return vm.queryInstant(query, time);
    }
  );

  // PromQL range query
  app.get<{
    Querystring: { query: string; start: string; end: string; step?: string };
  }>("/api/v1/metrics/query_range", async (request, reply) => {
    const { query, start, end, step } = request.query;
    if (!query || !start || !end) {
      return reply
        .status(400)
        .send({ error: "query, start, and end are required" });
    }
    return vm.queryRange(query, start, end, step);
  });

  // List metric label names
  app.get("/api/v1/metrics/labels", async () => {
    return vm.getLabels();
  });

  // Get values for a specific label
  app.get<{ Params: { name: string } }>(
    "/api/v1/metrics/label/:name/values",
    async (request) => {
      return vm.getLabelValues(request.params.name);
    }
  );

  // List metric series
  app.get<{
    Querystring: { "match[]"?: string | string[]; start?: string; end?: string };
  }>("/api/v1/metrics/series", async (request, reply) => {
    const matchParam = request.query["match[]"];
    if (!matchParam) {
      return reply.status(400).send({ error: "match[] is required" });
    }
    const matches = Array.isArray(matchParam) ? matchParam : [matchParam];
    return vm.getSeries(matches, request.query.start, request.query.end);
  });
}
