import { createServer } from "./server.js";
import { config } from "./config.js";
import { disconnectProducer } from "./services/kafka-producer.js";

async function main() {
  const app = await createServer();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[ingest-service] Listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log("[ingest-service] Shutting down...");
    await disconnectProducer();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
