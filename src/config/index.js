import path from "path";

/**
 * Centralized configuration from environment variables.
 * Required for boot: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
 */

function envBool(name, defaultValue = false) {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "true" || v === "1";
}

function parseCorsOrigins() {
  const list = process.env.CORS_ORIGINS;
  if (list) {
    return list
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.CLIENT_URL) {
    return [process.env.CLIENT_URL.trim()];
  }
  return [];
}

const port = Number(process.env.PORT);
const smtpPort = Number(process.env.SMTP_PORT);

const config = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number.isFinite(port) && port > 0 ? port : 3000,

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  /** development | test | production — used with WIPE_DB_ON_BOOT for local DB reset */
  appMode: process.env.APP_MODE || "development",
  wipeDbOnBoot: envBool("WIPE_DB_ON_BOOT"),

  /** Frontend origin(s) for CORS / Socket.IO (comma-separated in CORS_ORIGINS) */
  clientUrl: process.env.CLIENT_URL?.trim() || undefined,
  corsOrigins: parseCorsOrigins(),

  /** Log verification codes to console (any NODE_ENV); use for local debugging without SMTP */
  logVerificationCode: envBool("LOG_VERIFICATION_CODE"),

  /** Nodemailer-compatible SMTP (optional; register still succeeds if send fails) */
  mail: {
    host: process.env.SMTP_HOST?.trim() || undefined,
    port: Number.isFinite(smtpPort) ? smtpPort : 587,
    secure: envBool("SMTP_SECURE"),
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS?.trim() || undefined,
    from: process.env.MAIL_FROM?.trim() || "noreply@bildyapp.local",
  },

  /** Slack Incoming Webhook for 5xx alerts (optional) */
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL?.trim() || undefined,

  swagger: {
    path: process.env.SWAGGER_PATH?.trim() || "/api-docs",
  },

  /** Relative to process.cwd(); generated delivery-note PDFs stored here */
  paths: {
    pdfStorageRelative:
      process.env.PDF_STORAGE_DIR?.replace(/^[/\\]+/, "").trim() ||
      path.join("uploads", "pdfs"),
  },
};

/**
 * Throws if required secrets / DB URL are missing (call early in index.js).
 */
export function assertRequiredConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push("MONGO_URI");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (!config.jwtRefreshSecret) missing.push("JWT_REFRESH_SECRET");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export default config;
