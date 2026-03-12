import { evaluateRules } from "./services/rule-evaluator.js";

let intervalId: ReturnType<typeof setInterval> | null = null;

const DEFAULT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Start the alert evaluation loop.
 */
export function startScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (intervalId) {
    console.warn("[scheduler] Already running");
    return;
  }

  console.log(
    `[scheduler] Starting alert evaluation every ${intervalMs / 1000}s`
  );

  // Run immediately on start
  evaluateRules().catch((err) =>
    console.error("[scheduler] Evaluation failed:", err)
  );

  intervalId = setInterval(async () => {
    try {
      await evaluateRules();
    } catch (err) {
      console.error("[scheduler] Evaluation failed:", err);
    }
  }, intervalMs);
}

/**
 * Stop the alert evaluation loop.
 */
export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Stopped");
  }
}
