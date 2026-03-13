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

// --- OTLP JSON parsing helpers ---

function otlpAttrValue(val: Record<string, unknown>): string {
  if (val.stringValue !== undefined) return String(val.stringValue);
  if (val.intValue !== undefined) return String(val.intValue);
  if (val.doubleValue !== undefined) return String(val.doubleValue);
  if (val.boolValue !== undefined) return String(val.boolValue);
  return JSON.stringify(val);
}

function otlpAttrsToMap(
  attrs?: Array<{ key: string; value: Record<string, unknown> }>
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!attrs) return map;
  for (const a of attrs) {
    map[a.key] = otlpAttrValue(a.value);
  }
  return map;
}

function nanoToClickHouse(nanos: string | number): string {
  const ns = BigInt(nanos);
  const ms = Number(ns / 1_000_000n);
  const subMs = Number(ns % 1_000_000n);
  const iso = new Date(ms).toISOString(); // 2026-03-13T22:57:57.987Z
  // ClickHouse DateTime64(9) expects: 2026-03-13 22:57:57.987000000
  const base = iso.replace("T", " ").replace("Z", "");
  const [sec, frac] = base.split(".");
  const nanoFrac = (frac ?? "000").padEnd(3, "0") + String(subMs).padStart(6, "0");
  return `${sec}.${nanoFrac}`;
}

function parseOtlpLogs(
  data: Record<string, unknown>
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const resourceLogs = data.resourceLogs as Array<Record<string, unknown>>;
  if (!resourceLogs) return rows;

  for (const rl of resourceLogs) {
    const resource = rl.resource as Record<string, unknown> | undefined;
    const resourceAttrs = otlpAttrsToMap(
      resource?.attributes as Array<{
        key: string;
        value: Record<string, unknown>;
      }>
    );
    const serviceName = resourceAttrs["service.name"] ?? "unknown";

    const scopeLogs = rl.scopeLogs as Array<Record<string, unknown>>;
    if (!scopeLogs) continue;

    for (const sl of scopeLogs) {
      const logRecords = sl.logRecords as Array<Record<string, unknown>>;
      if (!logRecords) continue;

      for (const lr of logRecords) {
        const attrs = otlpAttrsToMap(
          lr.attributes as Array<{
            key: string;
            value: Record<string, unknown>;
          }>
        );
        rows.push({
          timestamp: nanoToClickHouse(
            (lr.timeUnixNano as string) ?? (lr.observedTimeUnixNano as string)
          ),
          trace_id: (lr.traceId as string) ?? "",
          span_id: (lr.spanId as string) ?? "",
          severity: (lr.severityText as string) ?? "INFO",
          service_name: serviceName,
          body:
            (lr.body as Record<string, unknown>)?.stringValue ??
            JSON.stringify(lr.body ?? ""),
          attributes: attrs,
          resource: resourceAttrs,
        });
      }
    }
  }
  return rows;
}

function parseOtlpTraces(
  data: Record<string, unknown>
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const resourceSpans = data.resourceSpans as Array<Record<string, unknown>>;
  if (!resourceSpans) return rows;

  for (const rs of resourceSpans) {
    const resource = rs.resource as Record<string, unknown> | undefined;
    const resourceAttrs = otlpAttrsToMap(
      resource?.attributes as Array<{
        key: string;
        value: Record<string, unknown>;
      }>
    );
    const serviceName = resourceAttrs["service.name"] ?? "unknown";

    const scopeSpans = rs.scopeSpans as Array<Record<string, unknown>>;
    if (!scopeSpans) continue;

    for (const ss of scopeSpans) {
      const spans = ss.spans as Array<Record<string, unknown>>;
      if (!spans) continue;

      for (const span of spans) {
        const attrs = otlpAttrsToMap(
          span.attributes as Array<{
            key: string;
            value: Record<string, unknown>;
          }>
        );

        const startNano = BigInt((span.startTimeUnixNano as string) ?? "0");
        const endNano = BigInt((span.endTimeUnixNano as string) ?? "0");
        const durationNs = endNano > startNano ? endNano - startNano : 0n;

        const status = span.status as Record<string, unknown> | undefined;
        const statusCode =
          status?.code === 2
            ? "ERROR"
            : status?.code === 1
              ? "OK"
              : "UNSET";

        const spanKindMap: Record<number, string> = {
          1: "INTERNAL",
          2: "SERVER",
          3: "CLIENT",
          4: "PRODUCER",
          5: "CONSUMER",
        };

        const events = span.events as Array<Record<string, unknown>>;

        rows.push({
          timestamp: nanoToClickHouse(
            (span.startTimeUnixNano as string) ?? "0"
          ),
          trace_id: (span.traceId as string) ?? "",
          span_id: (span.spanId as string) ?? "",
          parent_span_id: (span.parentSpanId as string) ?? "",
          service_name: serviceName,
          operation_name: (span.name as string) ?? "",
          span_kind:
            spanKindMap[(span.kind as number) ?? 0] ?? "INTERNAL",
          duration_ns: Number(durationNs),
          status_code: statusCode,
          status_message: (status?.message as string) ?? "",
          attributes: attrs,
          events_timestamp: Array.isArray(events)
            ? events.map((e) =>
                nanoToClickHouse((e.timeUnixNano as string) ?? "0")
              )
            : [],
          events_name: Array.isArray(events)
            ? events.map((e) => (e.name as string) ?? "")
            : [],
          resource: resourceAttrs,
        });
      }
    }
  }
  return rows;
}

async function flushLogs(): Promise<void> {
  if (logBuffer.records.length === 0) return;

  const batch = logBuffer.records.splice(0, logBuffer.records.length);
  logBuffer.lastFlush = Date.now();

  try {
    await clickhouse.insert({
      table: "logs",
      values: batch,
      format: "JSONEachRow",
    });
    console.log(`[consumer] Flushed ${batch.length} logs to ClickHouse`);
  } catch (err) {
    console.error("[consumer] Failed to flush logs:", err);
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
      values: batch,
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
  await consumer.subscribe({
    topics: ["obs.logs", "obs.traces"],
    fromBeginning: true,
  });

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
          const rows = parseOtlpLogs(data);
          logBuffer.records.push(...rows);
          if (logBuffer.records.length >= BATCH_SIZE) await flushLogs();
        } else if (topic === "obs.traces") {
          const rows = parseOtlpTraces(data);
          traceBuffer.records.push(...rows);
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
