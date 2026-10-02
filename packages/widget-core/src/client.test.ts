import { afterEach, describe, expect, it, vi } from "vitest";
import { FasterFixesClient } from "./client.js";

afterEach(() => vi.unstubAllGlobals());

describe("image review request scope", () => {
  it("sends the image and reviewer scope for list, create, edit and delete", async () => {
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );
    vi.stubGlobal("fetch", fetch);
    const client = new FasterFixesClient({
      apiKey: "proj_fixture",
      apiOrigin: "https://api.example.test",
      reviewImageId: "img_fixture",
    });
    await client.getFeedback("reviewer_fixture");
    await client.createFeedback(
      {
        comment: "Move this label",
        pageUrl: "https://example.test/review/images/img_fixture",
      },
      "reviewer_fixture",
    );
    await client.updateFeedback(
      "feedback_fixture",
      { comment: "Updated label" },
      "reviewer_fixture",
    );
    await client.deleteFeedback("feedback_fixture", "reviewer_fixture");
    expect(fetch).toHaveBeenCalledTimes(4);
    for (const call of fetch.mock.calls) {
      const init = call[1];
      expect(new Headers(init?.headers).get("X-Review-Image")).toBe(
        "img_fixture",
      );
      expect(new Headers(init?.headers).get("X-Reviewer-Token")).toBe(
        "reviewer_fixture",
      );
    }
  });
  it("keeps ordinary website feedback outside image scope", async () => {
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );
    vi.stubGlobal("fetch", fetch);
    await new FasterFixesClient({ apiKey: "proj_fixture" }).getFeedback(
      "reviewer_fixture",
    );
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).has("X-Review-Image"),
    ).toBe(false);
  });
});
