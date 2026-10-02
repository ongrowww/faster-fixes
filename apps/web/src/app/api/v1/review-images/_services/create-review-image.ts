import { ForbiddenError } from "@/server/errors/domain-errors";
import { storageProvider } from "@/server/storage";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { requireEnv } from "@/utils/environment/require-env";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import type { CreateReviewImageInput } from "./create-review-image.schema";

export async function createReviewImage(
  {
    projectId,
    reviewerId,
    data,
  }: {
    projectId: string;
    reviewerId: string;
    data: CreateReviewImageInput;
  },
  db: typeof prisma = prisma,
) {
  const prefix = `review-images/${projectId}/${reviewerId}/`;
  const extension =
    data.mimeType === "image/jpeg" ? "jpg" : data.mimeType.split("/")[1];
  const filenamePattern = new RegExp(
    `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${extension}$`,
  );
  if (
    !data.key.startsWith(prefix) ||
    !filenamePattern.test(data.key.slice(prefix.length))
  ) {
    throw new ForbiddenError("Invalid image key.");
  }
  const bucket = requireEnv(
    "STORAGE_BUCKET_NAME",
    process.env.STORAGE_BUCKET_NAME,
  );
  const image = await db.$transaction(async (transaction) => {
    const asset = await transaction.asset.create({
      data: { ...data, bucket, provider: storageProvider },
    });
    return transaction.reviewImage.create({
      data: {
        publicId: `rimg_${crypto.randomBytes(16).toString("hex")}`,
        projectId,
        uploadedByReviewerId: reviewerId,
        assetId: asset.id,
      },
      include: { asset: true },
    });
  });
  return {
    id: image.publicId,
    filename: image.asset.filename,
    url: await getSignedAssetUrl(image.asset),
  };
}

export type CreateReviewImageOutput = Awaited<
  ReturnType<typeof createReviewImage>
>;
