"use server";

import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

export const getReviewImages = protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input, ctx }) => {
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { organizationId: true },
    });
    if (!project)
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

    const membership = await ctx.prisma.member.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: ctx.session.user.id,
      },
    });
    if (!membership)
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });

    const images = await ctx.prisma.reviewImage.findMany({
      where: { projectId: input.projectId },
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
  });

export type GetReviewImagesOutput = inferProcedureOutput<
  typeof getReviewImages
>;
