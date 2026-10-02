import { prisma } from "@workspace/db";

export async function findReviewImage(
  { publicId, projectId }: { publicId: string; projectId: string },
  db: typeof prisma = prisma,
) {
  return db.reviewImage.findFirst({
    where: { publicId, projectId, archivedAt: null },
    include: { asset: true },
  });
}

export type FindReviewImageOutput = Awaited<ReturnType<typeof findReviewImage>>;
