import type { FastifyInstance } from "fastify";
import { sendToKafka } from "../services/kafka-producer.js";
import type { Span } from "@obs/shared";

interface IngestTracesBody {
  spans: Span[];
}

export async function traceRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: IngestTracesBody }>(
    "/api/v1/traces",
    async (request, reply) => {
      const { spans } = request.body;

      if (!Array.isArray(spans) || spans.length === 0) {
        return reply.status(400).send({ error: "spans array is required" });
      }

      const messages = spans.map((span) => ({
        key: span.traceId,
        value: JSON.stringify(span),
      }));

      await sendToKafka("obs.traces", messages);

      return { accepted: spans.length };
    }
  );
}
