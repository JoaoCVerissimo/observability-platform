import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { logRoutes } from "./routes/logs.js";
import { traceRoutes } from "./routes/traces.js";
import { metricRoutes } from "./routes/metrics.js";

export async function createServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  await app.register(healthRoutes);
  await app.register(logRoutes);
  await app.register(traceRoutes);
  await app.register(metricRoutes);

  return app;
}
