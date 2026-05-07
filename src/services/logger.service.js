import config from "../config/index.js";

/**
 * Sends an alert to Slack (Incoming Webhook) for uncaught / 5xx-class failures.
 * No-op if `SLACK_WEBHOOK_URL` is unset, or in `NODE_ENV=test` (avoid CI noise & network).
 */
export async function notifySlackServerError(err, req) {
  if (!config.slackWebhookUrl) return;
  if (process.env.NODE_ENV === "test") return;

  const timestamp = new Date().toISOString();
  const method = req?.method ?? "?";
  const route = req?.originalUrl ?? req?.url ?? req?.path ?? "?";

  const message = err?.message ?? String(err);
  const stack = err?.stack ?? "";

  const text = [
    "*BildyApp server error (5xx)*",
    `*Time:* ${timestamp}`,
    `*Method:* ${method}`,
    `*Route:* ${route}`,
    `*Message:* ${message}`,
    "*Stack:*",
    "```",
    stack.length > 3500 ? `${stack.slice(0, 3500)}\n… (truncated)` : stack,
    "```",
  ].join("\n");

  try {
    const res = await fetch(config.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Slack webhook HTTP error:", res.status, body);
    }
  } catch (e) {
    console.error("Slack webhook request failed:", e);
  }
}
