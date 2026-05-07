import { sendVerificationCode, isMailConfigured } from "../src/services/mail.service.js";

describe("mail.service", () => {
  it("isMailConfigured is false when SMTP_HOST cleared in tests", () => {
    expect(isMailConfigured()).toBe(false);
  });

  it("sendVerificationCode skips when mail not configured", async () => {
    const r = await sendVerificationCode({ to: "a@b.com", code: "123456" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("mail_not_configured");
  });
});
