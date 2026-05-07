import nodemailer from "nodemailer";
import config from "../config/index.js";

let transporter = null;

function getTransporter() {
  if (!config.mail.host) return null;
  if (!transporter) {
    const hasAuth = Boolean(config.mail.user && config.mail.pass);
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      ...(hasAuth ? { auth: { user: config.mail.user, pass: config.mail.pass } } : {}),
    });
  }
  return transporter;
}

export function isMailConfigured() {
  return Boolean(config.mail.host);
}

function verificationTemplates(code) {
  const text = [
    "Your BildyApp verification code is:",
    "",
    code,
    "",
    "Enter this code in the app to verify your email. If you did not create an account, you can ignore this message.",
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:sans-serif;line-height:1.5">
<p>Your BildyApp verification code is:</p>
<p style="font-size:1.5rem;font-weight:600;letter-spacing:0.2em">${code}</p>
<p style="color:#555">Enter this code in the app to verify your email. If you did not create an account, you can ignore this message.</p>
</body></html>`;

  return { text, html };
}

/**
 * Sends the 6-digit registration verification code. Does not throw.
 * @returns {{ ok: true } | { ok: false, reason: string, error?: string }}
 */
export async function sendVerificationCode({ to, code }) {
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, reason: "mail_not_configured" };
  }

  const { text, html } = verificationTemplates(code);
  const subject = "Verify your BildyApp email";

  try {
    await transport.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error("[mail] Verification email send failed:", err.message);
    return { ok: false, reason: "send_failed", error: err.message };
  }
}
