"use server";

import { protectedProcedure } from "@/server/trpc/trpc";
import { inferProcedureOutput, TRPCError } from "@trpc/server";
import z from "zod";

export const setReviewImageArchived = protectedProcedure
  .input(z.object({ imageId: z.string(), archived: z.boolean() }))
  .mutation(async ({ input, ctx }) => {
    const image = await ctx.prisma.reviewImage.findUnique({
      where: { id: input.imageId },
      include: { project: { select: { organizationId: true } } },
    });
    if (!image)
      throw new TRPCError({ code: "NOT_FOUND", message: "Image not found." });

    const membership = await ctx.prisma.member.findFirst({
      where: {
        organizationId: image.project.organizationId,
        userId: ctx.session.user.id,
        role: { in: ["owner", "admin"] },
      },
    });
    if (!membership)
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });

    await ctx.prisma.reviewImage.update({
      where: { id: image.id },
      data: { archivedAt: input.archived ? new Date() : null },
    });
    return { id: image.id };
  });

export type SetReviewImageArchivedOutput = inferProcedureOutput<
  typeof setReviewImageArchived
>;
