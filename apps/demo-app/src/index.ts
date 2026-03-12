// Initialize the observability SDK BEFORE importing anything else
import { init, logger, metrics, tracer } from "@obs/sdk";

init({
  serviceName: "demo-app",
  endpoint: process.env.OTEL_COLLECTOR_GRPC ?? "http://localhost:4317",
  version: "0.1.0",
  environment: "development",
});

import express from "express";

const app = express();
const port = parseInt(process.env.PORT ?? "4000", 10);

// Create metrics
const requestCounter = metrics.counter("demo.http.requests.total", {
  description: "Total HTTP requests to demo app",
});
const requestDuration = metrics.histogram("demo.http.request.duration_ms", {
  description: "HTTP request duration in milliseconds",
});
const activeConnections = metrics.gauge("demo.http.active_connections", {
  description: "Number of active connections",
});

let connectionCount = 0;

// Middleware to track request metrics
app.use((req, res, next) => {
  const start = Date.now();
  connectionCount++;
  activeConnections.set(connectionCount);

  res.on("finish", () => {
    connectionCount--;
    activeConnections.set(connectionCount);

    const duration = Date.now() - start;
    requestCounter.add(1, { method: req.method, path: req.path, status: String(res.statusCode) });
    requestDuration.record(duration, { method: req.method, path: req.path });

    logger.info("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
    });
  });

  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({ service: "demo-app", status: "ok" });
});

app.get("/api/users", async (req, res) => {
  await tracer.withSpan("fetch-users", async (span) => {
    // Simulate database query
    const delay = Math.random() * 100 + 10;
    await new Promise((resolve) => setTimeout(resolve, delay));

    span.setAttributes({ "db.system": "postgresql", "db.operation": "SELECT" });

    const users = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ];

    logger.info("Fetched users from database", { count: users.length });
    res.json(users);
  });
});

app.get("/api/orders", async (req, res) => {
  await tracer.withSpan("fetch-orders", async (span) => {
    const delay = Math.random() * 200 + 20;
    await new Promise((resolve) => setTimeout(resolve, delay));

    span.setAttributes({ "db.system": "postgresql", "db.operation": "SELECT" });

    const orders = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      userId: Math.floor(Math.random() * 3) + 1,
      total: Math.round(Math.random() * 10000) / 100,
    }));

    logger.info("Fetched orders", { count: orders.length });
    res.json(orders);
  });
});

app.post("/api/checkout", async (req, res) => {
  await tracer.withSpan("process-checkout", async (span) => {
    span.setAttributes({ "checkout.step": "validate" });

    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate occasional failures
    if (Math.random() < 0.2) {
      logger.error("Checkout failed: payment declined", {
        error_code: "PAYMENT_DECLINED",
      });
      res.status(500).json({ error: "Payment declined" });
      return;
    }

    // Simulate payment processing
    await tracer.withSpan("process-payment", async (paymentSpan) => {
      paymentSpan.setAttributes({ "payment.method": "credit_card" });
      await new Promise((resolve) => setTimeout(resolve, 150));
      logger.info("Payment processed successfully", { amount: 99.99 });
    });

    res.json({ orderId: crypto.randomUUID(), status: "confirmed" });
  });
});

app.get("/api/slow", async (req, res) => {
  await tracer.withSpan("slow-endpoint", async (span) => {
    span.setAttributes({ "slow.reason": "simulated" });
    const delay = Math.random() * 2000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    logger.warn("Slow request detected", { duration_ms: delay });
    res.json({ message: "This was intentionally slow", delay_ms: Math.round(delay) });
  });
});

app.get("/api/error", (req, res) => {
  logger.error("Intentional error endpoint hit", {
    error_type: "simulated",
  });
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  logger.info(`Demo app started on port ${port}`);
  console.log(`[demo-app] Listening on http://localhost:${port}`);
});
