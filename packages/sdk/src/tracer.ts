import {
  trace,
  type Span,
  type SpanOptions,
  SpanStatusCode,
  context,
} from "@opentelemetry/api";

const otelTracer = trace.getTracer("@obs/sdk");

/**
 * Tracer helper for creating manual spans.
 * Most instrumentation is automatic, but use this for custom business logic spans.
 *
 * @example
 * ```ts
 * import { tracer } from '@obs/sdk';
 *
 * // Simple span
 * const span = tracer.startSpan('process-payment');
 * span.setAttributes({ 'payment.method': 'credit_card' });
 * span.end();
 *
 * // Span with callback (auto-ended)
 * const result = await tracer.withSpan('validate-order', async (span) => {
 *   span.setAttributes({ 'order.id': orderId });
 *   return await validateOrder(orderId);
 * });
 * ```
 */
export const tracer = {
  /**
   * Start a new span. Remember to call `span.end()` when done.
   */
  startSpan(name: string, options?: SpanOptions): Span {
    return otelTracer.startSpan(name, options);
  },

  /**
   * Execute a function within a new span. The span is automatically ended
   * when the function completes (or throws).
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    return otelTracer.startActiveSpan(name, options ?? {}, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      } finally {
        span.end();
      }
    });
  },

  /**
   * Get the current active span, if any.
   */
  getActiveSpan(): Span | undefined {
    return trace.getSpan(context.active());
  },
};
