import { resolveProject } from "@/server/api/resolve-project";
import { validateReviewer } from "@/server/api/validate-reviewer";
import { storageProvider } from "@/server/storage";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateReviewImageSchema = z.object({
  key: z.string().min(1),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

async function authorize(req: NextRequest) {
  const project = await resolveProject(req.headers.get("x-api-key"));
  if (!project) return null;
  const reviewer = await validateReviewer(
    req.headers.get("x-reviewer-token"),
    project.id,
  );
  return reviewer ? { project, reviewer } : null;
}

function createPublicId() {
  return `rimg_${crypto.randomBytes(16).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  const context = await authorize(req);
  if (!context) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }

  const images = await prisma.reviewImage.findMany({
    where: { projectId: context.project.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      asset: true,
      uploadedByReviewer: { select: { name: true } },
      _count: { select: { feedback: true } },
    },
  });

  return NextResponse.json({
    project: { id: context.project.publicId, name: context.project.name },
    images: await Promise.all(
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
    ),
  });
}

export async function POST(req: NextRequest) {
  const context = await authorize(req);
  if (!context) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }

  const parsed = CreateReviewImageSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid image metadata.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const expectedPrefix = `review-images/${context.project.id}/`;
  if (!parsed.data.key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid image key." }, { status: 403 });
  }

  const bucket = process.env.STORAGE_BUCKET_NAME!;
  const reviewImage = await prisma.$transaction(async (transaction) => {
    const asset = await transaction.asset.create({
      data: {
        key: parsed.data.key,
        bucket,
        provider: storageProvider,
        filename: parsed.data.filename,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        width: parsed.data.width,
        height: parsed.data.height,
      },
    });
    return transaction.reviewImage.create({
      data: {
        publicId: createPublicId(),
        projectId: context.project.id,
        uploadedByReviewerId: context.reviewer.id,
        assetId: asset.id,
      },
      include: { asset: true },
    });
  });

  return NextResponse.json(
    {
      id: reviewImage.publicId,
      filename: reviewImage.asset.filename,
      url: await getSignedAssetUrl(reviewImage.asset),
    },
    { status: 201 },
  );
}
