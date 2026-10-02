import { findProjectByPublicId } from "@/app/_domains/project/_services/find-project-by-public-id";
import { findReviewerByToken } from "@/app/_domains/project/_services/find-reviewer-by-token";
import { findReviewImage } from "@/app/_domains/project/_services/find-review-image";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const project = await findProjectByPublicId(req.headers.get("x-api-key"));
  if (!project) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }
  const reviewer = await findReviewerByToken(
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
  const image = await findReviewImage({ publicId: id, projectId: project.id });
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
