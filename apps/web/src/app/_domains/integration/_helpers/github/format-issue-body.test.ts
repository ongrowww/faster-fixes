import { describe, expect, it } from "vitest";
import { formatIssueBody } from "./format-issue-body";

const feedback = {
  id: "feedback-fixture",
  comment: "Move the heading",
  pageUrl: "https://example.test/review/images/image-fixture",
  selector: "[data-review-image]",
  clickX: 25,
  clickY: 50,
  browserName: null,
  browserVersion: null,
  os: null,
  viewportWidth: null,
  viewportHeight: null,
  screenshotUrl: null,
  reviewerName: "Reviewer",
  metadata: null,
  projectId: "project-fixture",
  dashboardUrl:
    "https://dashboard.example.test/inbox?feedbackId=feedback-fixture",
};

describe("formatIssueBody", () => {
  it("includes the source review image and pin coordinates in a tracker issue", () => {
    const body = formatIssueBody({
      ...feedback,
      reviewImage: {
        filename: "design.png",
        url: "https://assets.example.test/design.png?signature=fixture",
      },
    });
    expect(body).toContain(
      "**Review image:** [design.png](https://assets.example.test/design.png?signature=fixture)",
    );
    expect(body).toContain("at (25, 50)");
    expect(body).toContain("View in dashboard");
  });

  it("does not invent a review-image link for website feedback", () => {
    const body = formatIssueBody({ ...feedback, reviewImage: null });
    expect(body).not.toContain("**Review image:**");
    expect(body).toContain("**Page:**");
  });
});
