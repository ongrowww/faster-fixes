import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { UpdateReviewImageArchivedInput } from "./update-review-image-archived.schema";

export async function updateReviewImageArchived(
  {
    imageId,
    archived,
    userId,
  }: UpdateReviewImageArchivedInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const image = await db.reviewImage.findUnique({
    where: { id: imageId },
    include: { project: { select: { organizationId: true } } },
  });
  if (!image) throw new NotFoundError("Image not found.");
  const membership = await db.member.findFirst({
    where: {
      organizationId: image.project.organizationId,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });
  if (!membership) throw new ForbiddenError("Access denied.");
  await db.reviewImage.update({
    where: { id: image.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  return { id: image.id };
}

export type UpdateReviewImageArchivedOutput = Awaited<
  ReturnType<typeof updateReviewImageArchived>
>;
