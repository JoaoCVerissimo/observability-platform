import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { ruleRoutes } from "./routes/rules.js";
import { alertRoutes } from "./routes/alerts.js";

export async function createServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  await app.register(healthRoutes);
  await app.register(ruleRoutes);
  await app.register(alertRoutes);

  return app;
}
