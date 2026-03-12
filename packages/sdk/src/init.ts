import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";

export interface ObsConfig {
  /** Name of the service sending telemetry */
  serviceName: string;
  /** OTel Collector gRPC endpoint (default: http://localhost:4317) */
  endpoint?: string;
  /** Deployment environment (default: development) */
  environment?: string;
  /** Service version */
  version?: string;
}

let sdk: NodeSDK | null = null;
let loggerProvider: LoggerProvider | null = null;

/**
 * Initialize the observability SDK. Call this before any other application code.
 *
 * @example
 * ```ts
 * import { init } from '@obs/sdk';
 * init({ serviceName: 'my-service' });
 * ```
 */
export function init(config: ObsConfig): void {
  if (sdk) {
    console.warn("[@obs/sdk] Already initialized, skipping.");
    return;
  }

  const endpoint = config.endpoint ?? "http://localhost:4317";

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    ...(config.version && { [ATTR_SERVICE_VERSION]: config.version }),
    "deployment.environment": config.environment ?? "development",
  });

  // Set up log exporter and provider
  const logExporter = new OTLPLogExporter({ url: endpoint });
  loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logExporter)
  );
  logs.setGlobalLoggerProvider(loggerProvider);

  // Set up the NodeSDK for traces and metrics
  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: endpoint }),
      exportIntervalMillis: 15_000,
    }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- version mismatch between sdk-metrics and sdk-node
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown on process exit
  const onShutdown = async () => {
    await shutdown();
    process.exit(0);
  };
  process.on("SIGTERM", onShutdown);
  process.on("SIGINT", onShutdown);

  console.log(
    `[@obs/sdk] Initialized for "${config.serviceName}" → ${endpoint}`
  );
}

/**
 * Gracefully shut down the SDK, flushing all pending telemetry.
 */
export async function shutdown(): Promise<void> {
  if (loggerProvider) {
    await loggerProvider.shutdown();
    loggerProvider = null;
  }
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
