import { createServer } from "./server.js";
import { config } from "./config.js";
import { startScheduler, stopScheduler } from "./scheduler.js";

async function main() {
  const app = await createServer();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[alert-service] Listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start the alert evaluation scheduler
  startScheduler();

  const shutdown = async () => {
    console.log("[alert-service] Shutting down...");
    stopScheduler();
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
