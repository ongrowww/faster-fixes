import { cloudflare, custom } from "@better-upload/server/clients";

export const storageProvider = process.env.STORAGE_PROVIDER ?? "r2";

if (storageProvider !== "r2" && storageProvider !== "s3") {
  throw new Error(
    `Unsupported STORAGE_PROVIDER: ${storageProvider}. Use "r2" or "s3".`,
  );
}

export const s3Client =
  storageProvider === "r2"
    ? cloudflare({
        accountId: process.env.R2_ACCOUNT_ID!,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      })
    : custom({
        host: new URL(process.env.STORAGE_ENDPOINT!).host,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        region: process.env.STORAGE_REGION!,
        secure: process.env.STORAGE_ENDPOINT!.startsWith("https:"),
        forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
      });
