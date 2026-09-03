import { resolveProject } from "@/server/api/resolve-project";
import { validateReviewer } from "@/server/api/validate-reviewer";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { prisma } from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const project = await resolveProject(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }
  const reviewer = await validateReviewer(
    req.headers.get("x-reviewer-token"),
    project.id,
  );
  if (!reviewer) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const image = await prisma.reviewImage.findFirst({
    where: { publicId: id, projectId: project.id, archivedAt: null },
    include: { asset: true },
  });
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: image.publicId,
    filename: image.asset.filename,
    mimeType: image.asset.mimeType,
    width: image.asset.width,
    height: image.asset.height,
    url: await getSignedAssetUrl(image.asset),
  });
}
