import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { stubWidgetApi } from "./widget-api-stub";

const PROJECT = "proj_image_fixture";
const IMAGE = "rimg_fixture";
const TOKEN = "reviewer_image_fixture";
const IMAGE_URL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="lightblue"/></svg>')}`;
const image = {
  id: IMAGE,
  filename: "Homepage design.svg",
  width: 1200,
  height: 800,
  url: IMAGE_URL,
  feedbackCount: 0,
  uploadedBy: "Reviewer fixture",
  createdAt: "2026-10-01T00:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ contentType: "application/json", body: "null" }),
  );
});

test("gallery removes its token from the URL and opens an image with the same session", async ({
  page,
}) => {
  await page.route("**/api/v1/review-images**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().includes(`/review-images/${IMAGE}`)
          ? image
          : {
              project: { id: PROJECT, name: "Review fixture" },
              images: [image],
            },
      ),
    }),
  );
  await page.route("**/api/v1/feedback**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ feedback: [] }),
    }),
  );
  await page.goto(`/review/images?project=${PROJECT}#ff_token=${TOKEN}`);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review fixture" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/ff_token/);
  expect(
    await page.evaluate(
      (project) => sessionStorage.getItem(`ff_review_token:${project}`),
      PROJECT,
    ),
  ).toBe(TOKEN);
  await page.getByRole("link", { name: "Homepage design.svg" }).click();
  await expect(
    page.getByRole("button", {
      name: "Place a feedback marker on Homepage design.svg",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All images" }).click();
  await expect(
    page.getByRole("heading", { name: "Review fixture" }),
  ).toBeVisible();
});

test("image pins survive reload and responsive resizing, and comments restore page scrolling", async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Image review tests require a baseURL");
  const api = await stubWidgetApi(page, { apiOrigin: new URL(baseURL).origin });
  await page.addInitScript(() => {
    window.addEventListener(
      "click",
      (event) => {
        if (
          !(event.target instanceof HTMLElement) ||
          !event.target.matches("[data-review-image]")
        )
          return;
        const rect = event.target.getBoundingClientRect();
        event.target.dataset.fixtureAnchorX = String(
          (event.clientX - rect.left) / rect.width,
        );
        event.target.dataset.fixtureAnchorY = String(
          (event.clientY - rect.top) / rect.height,
        );
      },
      true,
    );
  });
  await page.route("**/api/v1/review-images/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(image),
    }),
  );
  await page.goto(
    `/review/images/${IMAGE}?project=${PROJECT}#ff_token=${TOKEN}`,
  );
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  const target = page.getByRole("button", {
    name: "Place a feedback marker on Homepage design.svg",
  });
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Image target has no layout box");
  await target.click({
    position: { x: box.width * 0.25, y: box.height * 0.5 },
  });
  await expect(page.getByPlaceholder("Describe the issue...")).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("hidden");
  await page.getByPlaceholder("Describe the issue...").fill("Align the title");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const pin = page.getByRole("button", { name: "Feedback: Align the title" });
  await expect(pin).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe("");
  expect(
    api.requestsTo("POST", "/api/v1/feedback")[0]?.headers["x-review-image"],
  ).toBe(IMAGE);
  // Browser mouse coordinates are integer pixels, while responsive image rectangles can be fractional.
  const clickedAnchor = await page
    .locator("[data-review-image]")
    .evaluate((element) => ({
      x: Number(element.getAttribute("data-fixture-anchor-x")),
      y: Number(element.getAttribute("data-fixture-anchor-y")),
    }));
  expect(api.createdFeedback()[0]?.metadata?.pinAnchor).toEqual(clickedAnchor);
  await page.reload();
  await expect(pin).toBeVisible();
  await page.setViewportSize({ width: 640, height: 800 });
  await expect
    .poll(async () => {
      const imageBox = await target.boundingBox();
      const pinBox = await pin.boundingBox();
      if (!imageBox || !pinBox) return 100;
      return Math.abs(
        pinBox.x + 7 - (imageBox.x + imageBox.width * clickedAnchor.x),
      );
    })
    .toBeLessThan(2);
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByPlaceholder("Describe the issue...")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe("");
});

for (const interaction of ["choose", "drop"] as const) {
  test(`gallery ${interaction} uploads a PNG through presign, storage and registration, then opens it`, async ({
    page,
  }) => {
    const key = `review-images/project_internal_fixture/reviewer_internal_fixture/${randomUUID()}.png`;
    const storageUrl = "http://upload-storage.e2e.test/fixture.png";
    const uploads: {
      method: string;
      headers: Record<string, string>;
      body: Buffer | null;
    }[] = [];
    const presigns: { headers: Record<string, string>; body: unknown }[] = [];
    const registrations: { headers: Record<string, string>; body: unknown }[] =
      [];
    let imageDataUrl = "";
    let uploadedImage: typeof image | null = null;
    await page.route("**/api/v1/feedback**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ feedback: [] }),
      }),
    );
    await page.route("**/api/upload", async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as {
        route: string;
        metadata: { projectId: string };
        files: { name: string; size: number; type: string }[];
      };
      presigns.push({ headers: request.headers(), body });
      const file = body.files[0];
      if (!file) throw new Error("Presign request contained no file");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              signedUrl: storageUrl,
              file: { ...file, objectInfo: { key, metadata: {} } },
              headers: {},
            },
          ],
          metadata: {},
        }),
      });
    });
    await page.route(storageUrl, async (route) => {
      const request = route.request();
      uploads.push({
        method: request.method(),
        headers: request.headers(),
        body: request.postDataBuffer(),
      });
      await route.fulfill({
        status: request.method() === "OPTIONS" ? 204 : 200,
        headers: {
          "Access-Control-Allow-Origin": request.headers()["origin"] ?? "",
          "Access-Control-Allow-Methods": "PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: "",
      });
    });
    await page.route("**/api/v1/review-images**", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON() as {
          filename: string;
          width: number;
          height: number;
        };
        registrations.push({ headers: request.headers(), body });
        uploadedImage = {
          ...image,
          id: "rimg_uploaded_fixture",
          filename: body.filename,
          width: body.width,
          height: body.height,
          url: imageDataUrl,
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(uploadedImage),
        });
      }
      const detail = request
        .url()
        .includes("/review-images/rimg_uploaded_fixture");
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          detail
            ? uploadedImage
            : {
                project: { id: PROJECT, name: "Upload fixture" },
                images: uploadedImage ? [uploadedImage] : [],
              },
        ),
      });
    });
    await page.goto(`/review/images?project=${PROJECT}#ff_token=${TOKEN}`);
    await page.getByRole("button", { name: "Reject all", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Upload fixture" }),
    ).toBeVisible();
    imageDataUrl = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 16;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG fixture canvas is unavailable");
      context.fillStyle = "#123456";
      context.fillRect(0, 0, 24, 16);
      return canvas.toDataURL("image/png");
    });
    const buffer = Buffer.from(imageDataUrl.split(",")[1] ?? "", "base64");
    if (interaction === "choose") {
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Choose images" }).click();
      await (
        await chooser
      ).setFiles({ name: "New design.png", mimeType: "image/png", buffer });
    } else {
      const transfer = await page.evaluateHandle(
        (bytes) => {
          const data = new DataTransfer();
          data.items.add(
            new File([Uint8Array.from(bytes)], "New design.png", {
              type: "image/png",
            }),
          );
          return data;
        },
        [...buffer],
      );
      await page
        .locator("section")
        .filter({ has: page.getByRole("button", { name: "Choose images" }) })
        .dispatchEvent("drop", { dataTransfer: transfer });
      await transfer.dispose();
    }
    await expect(
      page.getByRole("link", { name: "New design.png" }),
    ).toBeVisible();
    expect(presigns).toHaveLength(1);
    expect(presigns[0]?.body).toEqual({
      route: "review-image",
      metadata: { projectId: PROJECT },
      files: [
        { name: "New design.png", type: "image/png", size: buffer.byteLength },
      ],
    });
    expect(presigns[0]?.headers["x-api-key"]).toBe(PROJECT);
    expect(presigns[0]?.headers["x-reviewer-token"]).toBe(TOKEN);
    const upload = uploads.find(({ method }) => method === "PUT");
    expect(upload?.body).toEqual(buffer);
    expect(upload?.headers["content-type"]).toBe("image/png");
    expect(upload?.headers["x-reviewer-token"]).toBeUndefined();
    expect(registrations).toHaveLength(1);
    expect(registrations[0]?.headers["x-api-key"]).toBe(PROJECT);
    expect(registrations[0]?.headers["x-reviewer-token"]).toBe(TOKEN);
    expect(registrations[0]?.body).toEqual({
      key,
      filename: "New design.png",
      mimeType: "image/png",
      size: buffer.byteLength,
      width: 24,
      height: 16,
    });
    await page.getByRole("link", { name: "New design.png" }).click();
    await expect(
      page.getByRole("button", {
        name: "Place a feedback marker on New design.png",
      }),
    ).toBeVisible();
  });
}
