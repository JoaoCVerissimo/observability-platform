import type { FastifyInstance } from "fastify";
import { sendToKafka } from "../services/kafka-producer.js";
import type { LogRecord } from "@obs/shared";

interface IngestLogsBody {
  logs: LogRecord[];
}

export async function logRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: IngestLogsBody }>("/api/v1/logs", async (request, reply) => {
    const { logs } = request.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return reply.status(400).send({ error: "logs array is required" });
    }

    const messages = logs.map((log) => ({
      key: log.serviceName,
      value: JSON.stringify(log),
    }));

    await sendToKafka("obs.logs", messages);

    return { accepted: logs.length };
  });
}
