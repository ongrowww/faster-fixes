import "server-only";

import nodemailer from "nodemailer";

import {
  Contact,
  EmailError,
  EmailResponse,
  Mailer,
  MailOptions,
} from "./types";

function unsupportedContactsFeature(): never {
  throw new EmailError(
    "Contact management is not supported by the SMTP mailer.",
    "UNSUPPORTED",
  );
}

export class SmtpMailer implements Mailer {
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  public emails = {
    send: async (options: MailOptions): Promise<EmailResponse> => {
      if (!options.body) {
        throw new EmailError("SMTP requires an email body.", "MISSING_BODY");
      }

      const result = await this.transport.sendMail({
        from: process.env.SMTP_FROM ?? options.from,
        to: options.to,
        subject: options.subject,
        html: options.body,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.name,
          content: Buffer.from(attachment.content, "base64"),
          contentType: attachment.type,
        })),
      });

      return {
        success: true,
        message: "Email sent successfully",
        data: { messageId: result.messageId },
      };
    },
  };

  public contacts = {
    list: async (): Promise<Contact[]> => unsupportedContactsFeature(),
    create: async (): Promise<Contact> => unsupportedContactsFeature(),
    get: async (): Promise<Contact> => unsupportedContactsFeature(),
    update: async (): Promise<Contact> => unsupportedContactsFeature(),
    delete: async (): Promise<Contact> => unsupportedContactsFeature(),
    addToSegment: async (): Promise<void> => unsupportedContactsFeature(),
  };
}
