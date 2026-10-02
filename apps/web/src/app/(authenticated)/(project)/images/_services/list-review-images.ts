import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";
import type { ListReviewImagesInput } from "./list-review-images.schema";

export async function listReviewImages(
  { projectId, userId }: ListReviewImagesInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found.");
  const membership = await db.member.findFirst({
    where: { organizationId: project.organizationId, userId },
  });
  if (!membership) throw new ForbiddenError("Access denied.");
  const images = await db.reviewImage.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      asset: true,
      uploadedByReviewer: { select: { name: true } },
      feedback: { select: { status: true } },
    },
  });
  return Promise.all(
    images.map(async (image) => ({
      id: image.id,
      publicId: image.publicId,
      filename: image.asset.filename,
      url: await getSignedAssetUrl(image.asset),
      uploadedBy: image.uploadedByReviewer?.name ?? null,
      createdAt: image.createdAt,
      archivedAt: image.archivedAt,
      feedbackCount: image.feedback.length,
      openFeedbackCount: image.feedback.filter(
        (feedback) =>
          feedback.status !== "resolved" && feedback.status !== "closed",
      ).length,
    })),
  );
}

export type ListReviewImagesOutput = Awaited<
  ReturnType<typeof listReviewImages>
>;
