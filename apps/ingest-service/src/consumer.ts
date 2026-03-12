import { Kafka } from "kafkajs";
import { createClient } from "@clickhouse/client";
import { config } from "./config.js";

const kafka = new Kafka({
  clientId: "obs-consumer",
  brokers: config.kafka.brokers,
});

const clickhouse = createClient({
  url: config.clickhouse.url,
  database: config.clickhouse.database,
  username: config.clickhouse.username,
  password: config.clickhouse.password,
});

// Batch buffer
interface BatchBuffer<T> {
  records: T[];
  lastFlush: number;
}

const BATCH_SIZE = 1000;
const FLUSH_INTERVAL_MS = 5000;

const logBuffer: BatchBuffer<Record<string, unknown>> = {
  records: [],
  lastFlush: Date.now(),
};

const traceBuffer: BatchBuffer<Record<string, unknown>> = {
  records: [],
  lastFlush: Date.now(),
};

async function flushLogs(): Promise<void> {
  if (logBuffer.records.length === 0) return;

  const batch = logBuffer.records.splice(0, logBuffer.records.length);
  logBuffer.lastFlush = Date.now();

  try {
    await clickhouse.insert({
      table: "logs",
      values: batch.map((log) => ({
        timestamp: log.timestamp ?? new Date().toISOString(),
        trace_id: log.traceId ?? "",
        span_id: log.spanId ?? "",
        severity: log.severity ?? "INFO",
        service_name: log.serviceName ?? "unknown",
        body: log.body ?? "",
        attributes: log.attributes ?? {},
        resource: log.resource ?? {},
      })),
      format: "JSONEachRow",
    });
    console.log(`[consumer] Flushed ${batch.length} logs to ClickHouse`);
  } catch (err) {
    console.error("[consumer] Failed to flush logs:", err);
    // Re-add to buffer for retry
    logBuffer.records.unshift(...batch);
  }
}

async function flushTraces(): Promise<void> {
  if (traceBuffer.records.length === 0) return;

  const batch = traceBuffer.records.splice(0, traceBuffer.records.length);
  traceBuffer.lastFlush = Date.now();

  try {
    await clickhouse.insert({
      table: "traces",
      values: batch.map((span) => ({
        timestamp: span.timestamp ?? new Date().toISOString(),
        trace_id: span.traceId ?? "",
        span_id: span.spanId ?? "",
        parent_span_id: span.parentSpanId ?? "",
        service_name: span.serviceName ?? "unknown",
        operation_name: span.operationName ?? "",
        span_kind: span.spanKind ?? "INTERNAL",
        duration_ns: span.durationNs ?? 0,
        status_code: span.statusCode ?? "UNSET",
        status_message: span.statusMessage ?? "",
        attributes: span.attributes ?? {},
        events_timestamp: Array.isArray(span.events)
          ? span.events.map(
              (e: Record<string, unknown>) =>
                (e.timestamp as string) ?? new Date().toISOString()
            )
          : [],
        events_name: Array.isArray(span.events)
          ? span.events.map(
              (e: Record<string, unknown>) => (e.name as string) ?? ""
            )
          : [],
        resource: span.resource ?? {},
      })),
      format: "JSONEachRow",
    });
    console.log(`[consumer] Flushed ${batch.length} traces to ClickHouse`);
  } catch (err) {
    console.error("[consumer] Failed to flush traces:", err);
    traceBuffer.records.unshift(...batch);
  }
}

async function main(): Promise<void> {
  const consumer = kafka.consumer({ groupId: "obs-consumer-group" });

  await consumer.connect();
  await consumer.subscribe({ topics: ["obs.logs", "obs.traces"] });

  console.log("[consumer] Connected and subscribed to obs.logs, obs.traces");

  // Periodic flush
  setInterval(async () => {
    await flushLogs();
    await flushTraces();
  }, FLUSH_INTERVAL_MS);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      try {
        const data = JSON.parse(message.value.toString());

        if (topic === "obs.logs") {
          logBuffer.records.push(data);
          if (logBuffer.records.length >= BATCH_SIZE) await flushLogs();
        } else if (topic === "obs.traces") {
          traceBuffer.records.push(data);
          if (traceBuffer.records.length >= BATCH_SIZE) await flushTraces();
        }
      } catch (err) {
        console.error(`[consumer] Failed to parse message from ${topic}:`, err);
      }
    },
  });

  const shutdown = async () => {
    console.log("[consumer] Shutting down...");
    await flushLogs();
    await flushTraces();
    await consumer.disconnect();
    await clickhouse.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
