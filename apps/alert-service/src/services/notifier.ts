import { config } from "../config.js";
import type { AlertRule } from "@obs/shared";

export interface AlertNotification {
  rule: AlertRule;
  status: "firing" | "resolved";
  value: number;
  timestamp: string;
}

/**
 * Send alert notifications. Supports webhook and console output.
 */
export async function notify(notification: AlertNotification): Promise<void> {
  const { rule, status, value, timestamp } = notification;

  const emoji = status === "firing" ? "🔴" : "✅";
  const message = `${emoji} [${rule.severity.toUpperCase()}] Alert "${rule.name}" is ${status} — value: ${value}, threshold: ${rule.condition} ${rule.threshold}`;

  // Always log to console
  console.log(`[alert] ${timestamp} ${message}`);

  // Send to webhook if configured
  if (config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          alert: {
            ruleName: rule.name,
            ruleId: rule.id,
            severity: rule.severity,
            status,
            value,
            threshold: rule.threshold,
            condition: rule.condition,
            labels: rule.labels,
            timestamp,
          },
        }),
      });
    } catch (err) {
      console.error("[alert] Failed to send webhook notification:", err);
    }
  }
}
