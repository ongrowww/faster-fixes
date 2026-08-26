export const NO_REPLY_EMAIL =
  process.env.SMTP_FROM ?? `noreply@${process.env.DOMAIN_NAME}`;
export const SENDER_EMAIL =
  process.env.SMTP_FROM ?? `contact@${process.env.DOMAIN_NAME}`;
