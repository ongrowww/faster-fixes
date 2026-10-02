import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";
import { updateReviewImageArchived } from "./update-review-image-archived";

type FakeDb = NonNullable<Parameters<typeof updateReviewImageArchived>[1]>;
function fakeDb(
  image: { id: string; project: { organizationId: string } } | null,
  role: string | null,
) {
  return {
    reviewImage: {
      findUnique: vi.fn().mockResolvedValue(image),
      update: vi.fn().mockResolvedValue({ id: "image_1" }),
    },
    member: {
      findFirst: vi
        .fn()
        .mockImplementation(
          ({
            where,
          }: {
            where: { role: { in: string[] }; organizationId: string };
          }) =>
            role &&
            where.role.in.includes(role) &&
            where.organizationId === "org_1"
              ? { id: "member_1" }
              : null,
        ),
    },
  } as unknown as FakeDb;
}
const input = { imageId: "image_1", archived: true, userId: "user_1" };
const image = { id: "image_1", project: { organizationId: "org_1" } };
describe("updateReviewImageArchived", () => {
  it("refuses an unknown image", async () => {
    await expect(
      updateReviewImageArchived(input, fakeDb(null, "owner")),
    ).rejects.toThrow(new NotFoundError("Image not found."));
  });
  it.each([null, "member"])(
    "refuses a missing or ordinary membership (%s)",
    async (role) => {
      const db = fakeDb(image, role);
      await expect(updateReviewImageArchived(input, db)).rejects.toThrow(
        new ForbiddenError("Access denied."),
      );
      expect(db.reviewImage.update).not.toHaveBeenCalled();
    },
  );
  it.each(["owner", "admin"])("archives an image for a %s", async (role) => {
    const db = fakeDb(image, role);
    await expect(updateReviewImageArchived(input, db)).resolves.toEqual({
      id: "image_1",
    });
    expect(db.reviewImage.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { archivedAt: expect.any(Date) },
    });
  });
  it("restores an archived image without replacing it", async () => {
    const db = fakeDb(image, "admin");
    await updateReviewImageArchived({ ...input, archived: false }, db);
    expect(db.reviewImage.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { archivedAt: null },
    });
  });
});
