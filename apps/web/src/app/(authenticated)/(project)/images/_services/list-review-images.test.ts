import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";
import { listReviewImages } from "./list-review-images";

vi.mock("@/server/storage/get-signed-asset-url", () => ({
  getSignedAssetUrl: async () => "https://assets.test/signed",
}));
type FakeDb = NonNullable<Parameters<typeof listReviewImages>[1]>;
function fakeDb(
  organizationId: string | null,
  memberOrganizationId: string | null,
) {
  return {
    project: {
      findUnique: vi
        .fn()
        .mockResolvedValue(organizationId ? { organizationId } : null),
    },
    member: {
      findFirst: vi
        .fn()
        .mockImplementation(
          ({ where }: { where: { organizationId: string } }) =>
            where.organizationId === memberOrganizationId
              ? { id: "member_1" }
              : null,
        ),
    },
    reviewImage: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as FakeDb;
}
const input = { projectId: "project_1", userId: "user_1" };
describe("listReviewImages", () => {
  it("reports an unknown project", async () => {
    await expect(
      listReviewImages(input, fakeDb(null, "org_1")),
    ).rejects.toThrow(new NotFoundError("Project not found."));
  });
  it("refuses a membership in another project's organization", async () => {
    const db = fakeDb("org_1", "org_2");
    await expect(listReviewImages(input, db)).rejects.toThrow(
      new ForbiddenError("Access denied."),
    );
    expect(db.reviewImage.findMany).not.toHaveBeenCalled();
  });
  it("returns the empty gallery to an organization member", async () => {
    await expect(
      listReviewImages(input, fakeDb("org_1", "org_1")),
    ).resolves.toEqual([]);
  });
  it("includes archived images and counts only unresolved, unarchived feedback as open", async () => {
    const db = fakeDb("org_1", "org_1");
    vi.mocked(db.reviewImage.findMany).mockResolvedValue([
      {
        id: "image_1",
        publicId: "rimg_fixture",
        createdAt: new Date("2026-01-01"),
        archivedAt: new Date("2026-01-02"),
        asset: { filename: "mockup.png" },
        uploadedByReviewer: { name: "Dana" },
        feedback: [
          { status: "new" },
          { status: "in_progress" },
          { status: "resolved" },
          { status: "closed" },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof db.reviewImage.findMany>>);
    await expect(listReviewImages(input, db)).resolves.toMatchObject([
      {
        id: "image_1",
        publicId: "rimg_fixture",
        filename: "mockup.png",
        url: "https://assets.test/signed",
        uploadedBy: "Dana",
        archivedAt: new Date("2026-01-02"),
        feedbackCount: 4,
        openFeedbackCount: 2,
      },
    ]);
  });
});
