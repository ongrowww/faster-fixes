import { prisma } from "@workspace/db";
import { resolveProject } from "./resolve-project";
import { validateOrigin } from "./validate-origin";
import { validateReviewer } from "./validate-reviewer";

export async function resolveFeedbackContext(headers: Headers) {
  const project = await resolveProject(headers.get("x-api-key"));
  if (!project) return null;

  const reviewer = await validateReviewer(
    headers.get("x-reviewer-token"),
    project.id,
  );
  if (!reviewer) return null;

  const reviewImageId = headers.get("x-review-image");
  if (!reviewImageId) {
    return validateOrigin(headers, project.domain)
      ? { project, reviewer, reviewImage: null }
      : null;
  }

  const reviewImage = await prisma.reviewImage.findFirst({
    where: {
      publicId: reviewImageId,
      projectId: project.id,
      archivedAt: null,
    },
    select: { id: true, publicId: true },
  });

  return reviewImage ? { project, reviewer, reviewImage } : null;
}
