import "server-only";

import { requireEnv } from "@/utils/environment/require-env";

import { PlunkMailer } from "./plunk";
import { ResendMailer } from "./resend";
import { SmtpMailer } from "./smtp";
import type { Mailer } from "./types";

export function createMailer(): Mailer {
  const provider = process.env.MAILER_PROVIDER ?? "resend";

  switch (provider) {
    case "plunk":
      // `client.ts` calls this at import, and PlunkMailer never threw on a missing key
      return new PlunkMailer(process.env.PLUNK_SECRET_KEY ?? "");
    case "resend":
      // The Resend SDK already throws without a key: this only names the variable
      return new ResendMailer(
        requireEnv("RESEND_API_KEY", process.env.RESEND_API_KEY),
      );
    case "smtp":
      return new SmtpMailer();
    default:
      throw new Error(`Unsupported mailer provider: ${String(provider)}`);
  }
}
