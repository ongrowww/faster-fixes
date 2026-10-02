import { NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

type GetProjectFeedbackInput = {
  feedbackId: string;
  projectId: string;
  reviewImageId?: string | null;
};

/**
 * One Feedback of a Project, read before the widget edits or deletes it. The
 * An active Reviewer may act on any Feedback in the authorized page or Review
 * Image context of the Project, not only the Feedback they submitted.
 */
export async function getProjectFeedback({
  feedbackId,
  projectId,
  reviewImageId = null,
}: GetProjectFeedbackInput) {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, projectId, reviewImageId },
  });

  if (!feedback) {
    // No period: this copy is the published widget API contract.
    throw new NotFoundError("Feedback not found");
  }

  return feedback;
}

export type GetProjectFeedbackOutput = Awaited<
  ReturnType<typeof getProjectFeedback>
>;
