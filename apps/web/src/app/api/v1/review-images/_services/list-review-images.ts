import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";

export async function listReviewImages(projectId: string) {
  const images = await prisma.reviewImage.findMany({
    where: { projectId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      asset: true,
      uploadedByReviewer: { select: { name: true } },
      _count: { select: { feedback: true } },
    },
  });
  return Promise.all(
    images.map(async (image) => ({
      id: image.publicId,
      filename: image.asset.filename,
      mimeType: image.asset.mimeType,
      width: image.asset.width,
      height: image.asset.height,
      url: await getSignedAssetUrl(image.asset),
      uploadedBy: image.uploadedByReviewer?.name ?? null,
      feedbackCount: image._count.feedback,
      createdAt: image.createdAt,
    })),
  );
}

export type ListReviewImagesOutput = Awaited<
  ReturnType<typeof listReviewImages>
>;
