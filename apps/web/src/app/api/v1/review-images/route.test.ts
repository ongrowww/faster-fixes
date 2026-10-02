import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, asset } = vi.hoisted(() => ({
  asset: {
    id: "asset_1",
    filename: "mockup.png",
    mimeType: "image/png",
    width: 1200,
    height: 800,
    key: "review-images/project_1/reviewer_1/12345678-1234-4123-a123-123456789abc.png",
    bucket: "fixture",
    provider: "s3",
  },
  db: {
    project: { findFirst: vi.fn() },
    reviewer: { findFirst: vi.fn() },
    reviewImage: { findMany: vi.fn(), findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock("@workspace/db", () => ({ prisma: db }));
vi.mock("@/server/storage", () => ({ storageProvider: "s3" }));
vi.mock("@/server/storage/get-signed-asset-url", () => ({
  getSignedAssetUrl: async () => "https://assets.test/signed",
}));
const { GET, POST } = await import("./route");
const { GET: getImage } = await import("./[id]/route");

function request(method = "GET", body?: unknown, token = "fixture-token") {
  return new NextRequest("https://app.test/api/v1/review-images", {
    method,
    headers: {
      "x-api-key": "proj_fixture",
      "x-reviewer-token": token,
      "content-type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const metadata = {
  key: asset.key,
  filename: asset.filename,
  mimeType: asset.mimeType,
  size: 1234,
  width: 1200,
  height: 800,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STORAGE_BUCKET_NAME", "fixture");
  db.project.findFirst.mockResolvedValue({
    id: "project_1",
    publicId: "proj_fixture",
    name: "Mockups",
  });
  db.reviewer.findFirst.mockImplementation(
    ({
      where,
    }: {
      where: { projectId: string; isActive: boolean; token: string };
    }) =>
      where.projectId === "project_1" &&
      where.isActive &&
      where.token === "fixture-token"
        ? { id: "reviewer_1" }
        : null,
  );
  db.reviewImage.findMany.mockResolvedValue([]);
  db.reviewImage.findFirst.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation(
    async (
      callback: (tx: {
        asset: { create: () => Promise<typeof asset> };
        reviewImage: {
          create: () => Promise<{ publicId: string; asset: typeof asset }>;
        };
      }) => Promise<unknown>,
    ) =>
      callback({
        asset: { create: async () => asset },
        reviewImage: {
          create: async () => ({ publicId: "rimg_fixture", asset }),
        },
      }),
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("Review Image API", () => {
  it("returns the public project and an empty gallery", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      project: { id: "proj_fixture", name: "Mockups" },
      images: [],
    });
  });
  it("refuses a Reviewer token from another project or a revoked token", async () => {
    const response = await GET(
      request("GET", undefined, "another-project-token"),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Invalid review link." });
  });
  it("hides archived images and images belonging to another project", async () => {
    db.reviewImage.findFirst.mockImplementation(
      ({
        where,
      }: {
        where: { publicId: string; projectId: string; archivedAt: Date | null };
      }) =>
        where.publicId === "rimg_live" &&
        where.projectId === "project_1" &&
        where.archivedAt === null
          ? { publicId: "rimg_live", asset }
          : null,
    );
    for (const id of ["rimg_archived", "rimg_other_project"]) {
      const response = await getImage(request(), {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Image not found." });
    }
    const response = await getImage(request(), {
      params: Promise.resolve({ id: "rimg_live" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: "rimg_live",
      filename: "mockup.png",
      url: "https://assets.test/signed",
    });
  });
  it.each([
    "review-images/another-project/reviewer_1/image.png",
    "review-images/project_1/another-reviewer/image.png",
    "review-images/project_1/reviewer_1/../../../organization-logos/foreign/logo.png",
    "review-images/project_1/reviewer_1/%2e%2e/%2e%2e/%2e%2e/organization-logos/foreign/logo.png",
    "review-images/project_1/reviewer_1/12345678-1234-4123-a123-123456789abc.png?other=asset",
    "review-images/project_1/reviewer_1/12345678-1234-4123-a123-123456789abc.png#asset",
    "review-images/project_1/reviewer_1/12345678-1234-4123-a123-123456789abc.jpg",
  ])("refuses an upload key owned by someone else (%s)", async (key) => {
    const response = await POST(request("POST", { ...metadata, key }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Invalid image key." });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("creates a Review Image from the Reviewer's uploaded asset", async () => {
    const response = await POST(request("POST", metadata));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "rimg_fixture",
      filename: "mockup.png",
      url: "https://assets.test/signed",
    });
  });
  it("rejects unsupported content and oversized image metadata", async () => {
    for (const override of [
      { mimeType: "application/pdf" },
      { size: 10 * 1024 * 1024 + 1 },
    ]) {
      const response = await POST(
        request("POST", { ...metadata, ...override }),
      );
      expect(response.status).toBe(422);
    }
  });
});
