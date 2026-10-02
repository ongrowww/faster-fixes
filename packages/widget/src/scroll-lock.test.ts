import { describe, expect, it, vi } from "vitest";
import { lockPageScroll } from "./scroll-lock.js";

function documentFixture(documentWidth: number, gutter = "") {
  return {
    defaultView: { innerWidth: 1280 },
    documentElement: {
      clientWidth: documentWidth,
      style: { overflow: "auto", scrollbarGutter: gutter },
    },
    body: { style: { overflow: "clip" } },
    addEventListener:
      vi.fn<
        (
          type: string,
          listener: (event: Event) => void,
          options: AddEventListenerOptions,
        ) => void
      >(),
  };
}

describe("comment scroll locking", () => {
  it.each(["", "auto"])(
    "does not create a classic scrollbar gutter when none occupies layout width (%s)",
    (gutter) => {
      const document = documentFixture(1280, gutter);
      const unlock = lockPageScroll(document);
      expect(document.documentElement.style).toEqual({
        overflow: "hidden",
        scrollbarGutter: gutter,
      });
      expect(document.body.style.overflow).toBe("hidden");
      unlock();
      expect(document.documentElement.style).toEqual({
        overflow: "auto",
        scrollbarGutter: gutter,
      });
      expect(document.body.style.overflow).toBe("clip");
    },
  );
  it("reserves the classic scrollbar width already occupied before locking", () => {
    const document = documentFixture(1265);
    const unlock = lockPageScroll(document);
    expect(document.documentElement.style.scrollbarGutter).toBe("stable");
    unlock();
    expect(document.documentElement.style).toEqual({
      overflow: "auto",
      scrollbarGutter: "",
    });
    expect(document.body.style.overflow).toBe("clip");
  });
  it("preserves and restores a pre-existing inline gutter instead of changing its width", () => {
    const document = documentFixture(1250, "stable both-edges");
    const unlock = lockPageScroll(document);
    expect(document.documentElement.style.scrollbarGutter).toBe(
      "stable both-edges",
    );
    unlock();
    expect(document.documentElement.style).toEqual({
      overflow: "auto",
      scrollbarGutter: "stable both-edges",
    });
  });
  it("stops the wheel and touch guards when the comment closes", () => {
    const document = documentFixture(1280);
    const unlock = lockPageScroll(document);
    const options = document.addEventListener.mock.calls.map((call) => call[2]);
    expect(document.addEventListener.mock.calls.map((call) => call[0])).toEqual(
      ["wheel", "touchmove"],
    );
    expect(options).toHaveLength(2);
    for (const option of options) {
      expect(option.capture).toBe(true);
      expect(option.passive).toBe(false);
      expect(option.signal?.aborted).toBe(false);
    }
    unlock();
    for (const option of options) expect(option.signal?.aborted).toBe(true);
  });
});
