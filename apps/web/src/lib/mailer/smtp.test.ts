import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailError } from "./types";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "smtp-message" });
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));
const { SmtpMailer } = await import("./smtp");

const message = {
  from: "sender@example.test",
  to: "recipient@example.test",
  subject: "Password reset",
  body: "<p>Reset your password</p>",
};

describe("SmtpMailer", () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("delivers HTML and decoded attachments through the configured SMTP transport", async () => {
    vi.stubEnv("SMTP_FROM", "authentication@example.test");
    const mailer = new SmtpMailer();
    await expect(
      mailer.emails.send({
        ...message,
        attachments: [
          { name: "example.txt", content: "dGVzdA==", type: "text/plain" },
        ],
      }),
    ).resolves.toEqual({
      success: true,
      message: "Email sent successfully",
      data: { messageId: "smtp-message" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "authentication@example.test",
      to: message.to,
      subject: message.subject,
      html: message.body,
      attachments: [
        {
          filename: "example.txt",
          content: Buffer.from("test"),
          contentType: "text/plain",
        },
      ],
    });
  });

  it("rejects a template-only email before attempting delivery", async () => {
    const mailer = new SmtpMailer();
    await expect(
      mailer.emails.send({ ...message, body: undefined, templateId: "reset" }),
    ).rejects.toMatchObject({ code: "MISSING_BODY" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("reports unsupported contact management instead of silently accepting it", async () => {
    const mailer = new SmtpMailer();
    await expect(mailer.contacts.list()).rejects.toBeInstanceOf(EmailError);
    await expect(mailer.contacts.create()).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
  });

  it("does not report delivery success when the SMTP server refuses the email", async () => {
    const outage = new Error("SMTP delivery refused");
    sendMail.mockRejectedValueOnce(outage);
    await expect(new SmtpMailer().emails.send(message)).rejects.toBe(outage);
  });
});
