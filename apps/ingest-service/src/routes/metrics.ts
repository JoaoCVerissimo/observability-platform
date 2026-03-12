import type { FastifyInstance } from "fastify";
import { sendToKafka } from "../services/kafka-producer.js";
import type { MetricDataPoint } from "@obs/shared";

interface IngestMetricsBody {
  metrics: MetricDataPoint[];
}

export async function metricRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: IngestMetricsBody }>(
    "/api/v1/metrics",
    async (request, reply) => {
      const { metrics } = request.body;

      if (!Array.isArray(metrics) || metrics.length === 0) {
        return reply.status(400).send({ error: "metrics array is required" });
      }

      const messages = metrics.map((m) => ({
        key: m.name,
        value: JSON.stringify(m),
      }));

      await sendToKafka("obs.metrics", messages);

      return { accepted: metrics.length };
    }
  );
}
