import "server-only";

import { PlunkMailer } from "./plunk";
import { ResendMailer } from "./resend";
import { SmtpMailer } from "./smtp";
import { Mailer } from "./types";

type MailerProvider = "plunk" | "resend" | "smtp";

export function createMailer(): Mailer {
  const provider = (process.env.MAILER_PROVIDER ?? "resend") as MailerProvider;

  switch (provider) {
    case "plunk":
      return new PlunkMailer(process.env.PLUNK_SECRET_KEY!);
    case "resend":
      return new ResendMailer(process.env.RESEND_API_KEY!);
    case "smtp":
      return new SmtpMailer();
    default:
      throw new Error(`Unsupported mailer provider: ${provider}`);
  }
}
