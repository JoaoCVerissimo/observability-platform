import { type Attributes } from "@opentelemetry/api";
import * as api from "@opentelemetry/api";

const meter = api.metrics.getMeter("@obs/sdk");

interface MetricOptions {
  description?: string;
  unit?: string;
}

/**
 * Metrics helper that creates and manages OpenTelemetry instruments.
 *
 * @example
 * ```ts
 * import { metrics } from '@obs/sdk';
 *
 * const requestCounter = metrics.counter('http.requests.total', {
 *   description: 'Total HTTP requests'
 * });
 * requestCounter.add(1, { method: 'GET', path: '/api/orders' });
 *
 * const latency = metrics.histogram('http.request.duration_ms', {
 *   description: 'Request latency in ms'
 * });
 * latency.record(42.5, { method: 'GET' });
 * ```
 */
export const metrics = {
  /**
   * Create a counter (monotonically increasing value).
   */
  counter(name: string, options?: MetricOptions) {
    const counter = meter.createCounter(name, options);
    return {
      add: (value: number, attributes?: Attributes) =>
        counter.add(value, attributes),
    };
  },

  /**
   * Create a gauge (point-in-time value).
   */
  gauge(name: string, options?: MetricOptions) {
    let currentValue = 0;
    let currentAttributes: Attributes = {};

    meter.createObservableGauge(name, options).addCallback((result) => {
      result.observe(currentValue, currentAttributes);
    });

    return {
      set: (value: number, attributes?: Attributes) => {
        currentValue = value;
        currentAttributes = attributes ?? {};
      },
    };
  },

  /**
   * Create a histogram (distribution of values).
   */
  histogram(name: string, options?: MetricOptions) {
    const histogram = meter.createHistogram(name, options);
    return {
      record: (value: number, attributes?: Attributes) =>
        histogram.record(value, attributes),
    };
  },
};
