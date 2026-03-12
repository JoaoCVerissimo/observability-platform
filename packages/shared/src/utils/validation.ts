/**
 * Validate that a string is a valid UUID v4.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Validate that a string is a valid ISO 8601 timestamp.
 */
export function isValidISO(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Parse and validate a limit parameter, returning a safe value.
 */
export function safeLimit(limit: unknown, defaultVal = 100, maxVal = 1000): number {
  const n = typeof limit === "number" ? limit : parseInt(String(limit), 10);
  if (isNaN(n)) return defaultVal;
  return clamp(n, 1, maxVal);
}

/**
 * Parse and validate an offset parameter.
 */
export function safeOffset(offset: unknown): number {
  const n = typeof offset === "number" ? offset : parseInt(String(offset), 10);
  if (isNaN(n) || n < 0) return 0;
  return n;
}
