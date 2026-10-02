import { findProjectByPublicId } from "@/app/_domains/project/_services/find-project-by-public-id";
import { findReviewerByToken } from "@/app/_domains/project/_services/find-reviewer-by-token";
import { checkRateLimit } from "@/server/rate-limit/check-rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { widgetErrorResponse } from "../feedback/_helpers/widget-error-response";
import { createReviewImage } from "./_services/create-review-image";
import { CreateReviewImageSchema } from "./_services/create-review-image.schema";
import { listReviewImages } from "./_services/list-review-images";

async function authorize(req: NextRequest) {
  const project = await findProjectByPublicId(req.headers.get("x-api-key"));
  if (!project) return null;
  const reviewer = await findReviewerByToken(
    req.headers.get("x-reviewer-token"),
    project.id,
  );
  return reviewer ? { project, reviewer } : null;
}

export async function GET(req: NextRequest) {
  const context = await authorize(req);
  if (!context) {
    return NextResponse.json(
      { error: "Invalid review link." },
      { status: 403 },
    );
  }
  return NextResponse.json({
    project: { id: context.project.publicId, name: context.project.name },
    images: await listReviewImages(context.project.id),
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
  const { allowed } = await checkRateLimit(context.project.id, "submit");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429 },
    );
  }
  const parsed = CreateReviewImageSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid image metadata.",
        details: z.flattenError(parsed.error),
      },
      { status: 422 },
    );
  }
  try {
    return NextResponse.json(
      await createReviewImage({
        projectId: context.project.id,
        reviewerId: context.reviewer.id,
        data: parsed.data,
      }),
      { status: 201 },
    );
  } catch (error) {
    const response = widgetErrorResponse(error);
    if (!response) throw error;
    return response;
  }
}
