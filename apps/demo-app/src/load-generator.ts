/**
 * Load generator that sends requests to the demo app to produce telemetry data.
 * Usage: pnpm --filter @obs/demo-app load
 */

const BASE_URL = process.env.DEMO_APP_URL ?? "http://localhost:4000";

const endpoints = [
  { path: "/api/users", weight: 30 },
  { path: "/api/orders", weight: 30 },
  { path: "/api/checkout", weight: 15, method: "POST" },
  { path: "/api/slow", weight: 10 },
  { path: "/api/error", weight: 5 },
  { path: "/", weight: 10 },
];

const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);

function pickEndpoint(): (typeof endpoints)[number] {
  let r = Math.random() * totalWeight;
  for (const endpoint of endpoints) {
    r -= endpoint.weight;
    if (r <= 0) return endpoint;
  }
  return endpoints[0];
}

async function sendRequest(): Promise<void> {
  const endpoint = pickEndpoint();
  const method = endpoint.method ?? "GET";

  try {
    const res = await fetch(`${BASE_URL}${endpoint.path}`, { method });
    const status = res.status;
    console.log(`${method} ${endpoint.path} -> ${status}`);
  } catch (err) {
    console.error(`${method} ${endpoint.path} -> FAILED:`, (err as Error).message);
  }
}

async function main(): Promise<void> {
  const rps = parseInt(process.env.RPS ?? "5", 10);
  const intervalMs = 1000 / rps;

  console.log(`[load-generator] Targeting ${BASE_URL} at ~${rps} req/s`);
  console.log("[load-generator] Press Ctrl+C to stop\n");

  // Run continuously
  const run = async () => {
    while (true) {
      sendRequest(); // fire and forget
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  };

  run();
}

main();
