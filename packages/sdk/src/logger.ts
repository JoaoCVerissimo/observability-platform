import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { trace, context } from "@opentelemetry/api";

type LogAttributes = Record<string, string | number | boolean>;

const SEVERITY_MAP = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
} as const;

function emit(
  level: keyof typeof SEVERITY_MAP,
  message: string,
  attributes?: LogAttributes
): void {
  const otelLogger = logs.getLogger("@obs/sdk");

  // Attach current span context for trace-log correlation
  const spanContext = trace.getSpan(context.active())?.spanContext();

  otelLogger.emit({
    severityNumber: SEVERITY_MAP[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes: {
      ...attributes,
      ...(spanContext && {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      }),
    },
  });
}

/**
 * Structured logger that sends logs to the OTel Collector.
 * Automatically correlates with the active trace/span.
 *
 * @example
 * ```ts
 * import { logger } from '@obs/sdk';
 * logger.info('Payment processed', { orderId: '123', amount: 99.99 });
 * logger.error('Payment failed', { orderId: '123', error: err.message });
 * ```
 */
export const logger = {
  debug: (message: string, attributes?: LogAttributes) =>
    emit("debug", message, attributes),
  info: (message: string, attributes?: LogAttributes) =>
    emit("info", message, attributes),
  warn: (message: string, attributes?: LogAttributes) =>
    emit("warn", message, attributes),
  error: (message: string, attributes?: LogAttributes) =>
    emit("error", message, attributes),
  fatal: (message: string, attributes?: LogAttributes) =>
    emit("fatal", message, attributes),
};
