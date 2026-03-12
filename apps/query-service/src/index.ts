import { createServer } from "./server.js";
import { config } from "./config.js";

async function main() {
  const app = await createServer();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[query-service] Listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log("[query-service] Shutting down...");
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
