/**
 * Convert a duration string like "5m", "1h", "24h", "7d" to milliseconds.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return value * multipliers[unit];
}

/**
 * Convert nanoseconds to milliseconds.
 */
export function nsToMs(ns: number): number {
  return ns / 1_000_000;
}

/**
 * Convert milliseconds to nanoseconds.
 */
export function msToNs(ms: number): number {
  return ms * 1_000_000;
}

/**
 * Get an ISO timestamp string for "now minus duration".
 */
export function timeAgo(duration: string): string {
  return new Date(Date.now() - parseDuration(duration)).toISOString();
}
