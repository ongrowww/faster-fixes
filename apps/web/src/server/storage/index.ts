import "server-only";

import { cloudflare, custom } from "@better-upload/server/clients";
import { requireEnv } from "@/utils/environment/require-env";

export const storageProvider = process.env.STORAGE_PROVIDER ?? "r2";

if (storageProvider !== "r2" && storageProvider !== "s3") {
  throw new Error(
    `Unsupported STORAGE_PROVIDER: ${storageProvider}. Use "r2" or "s3".`,
  );
}

function createS3Client() {
  if (storageProvider === "r2") {
    // The default client must remain importable during builds without R2 credentials.
    return cloudflare({
      accountId: process.env.R2_ACCOUNT_ID ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    });
  }

  const endpoint = new URL(
    requireEnv("STORAGE_ENDPOINT", process.env.STORAGE_ENDPOINT),
  );
  if (
    !["https:", "http:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error(
      "STORAGE_ENDPOINT must be an HTTP(S) origin without credentials or a path.",
    );
  }

  return custom({
    host: endpoint.host,
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey: requireEnv(
      "AWS_SECRET_ACCESS_KEY",
      process.env.AWS_SECRET_ACCESS_KEY,
    ),
    region: requireEnv("STORAGE_REGION", process.env.STORAGE_REGION),
    secure: endpoint.protocol === "https:",
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
  });
}

export const s3Client = createS3Client();
