import { useCallback, useEffect, useState } from "react";
import { domToBlob } from "modern-screenshot";
import { useFeedbackContext } from "../context.js";
import { overlayHighlightStyle } from "../styles.js";

export function AnnotationOverlay() {
  const {
    mode,
    setMode,
    classNames,
    setSelectedElement,
    setClickCoords,
    setScreenshotBlob,
    screenshotCaptureRef,
    annotationTarget,
  } = useFeedbackContext();

  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const selectTarget = useCallback(
    (target: Element, point: { x: number; y: number }) => {
      setSelectedElement(target);
      setClickCoords(point);

      // Capture screenshot asynchronously, store promise for submit to await
      const capturePromise = domToBlob(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: window.devicePixelRatio || 1,
        features: {
          restoreScrollPosition: true,
        },
        // Inverted from html2canvas: return true to INCLUDE, false to EXCLUDE
        filter: (el: Node) => {
          if (el instanceof Element) return !el.hasAttribute("data-ff-widget");
          return true;
        },
      }).catch((err) => {
        console.warn("[faster-fixes] screenshot capture failed:", err);
        return null;
      });

      screenshotCaptureRef.current = capturePromise;

      capturePromise.then((blob) => {
        if (blob) setScreenshotBlob(blob);
      });

      setMode("selected");
    },
    [
      screenshotCaptureRef,
      setClickCoords,
      setMode,
      setScreenshotBlob,
      setSelectedElement,
    ],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Ignore widget elements
      const target = e.target as Element;
      if (target.closest("[data-ff-widget]")) {
        setHighlightRect(null);
        return;
      }
      if (annotationTarget?.mode === "point") {
        setHighlightRect(null);
        return;
      }
      setHighlightRect(target.getBoundingClientRect());
    },
    [annotationTarget],
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const eventTarget = e.target as Element;
      if (eventTarget.closest("[data-ff-widget]")) return;

      const target = annotationTarget
        ? eventTarget.closest(annotationTarget.selector)
        : eventTarget;
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      selectTarget(target, { x: e.clientX, y: e.clientY });
    },
    [annotationTarget, selectTarget],
  );

  // Suppress pointer-down/mousedown so dialogs/drawers don't close
  const suppressEvent = useCallback(
    (e: Event) => {
      const target = e.target as Element;
      if (target.closest("[data-ff-widget]")) return;
      if (annotationTarget && !target.closest(annotationTarget.selector))
        return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
    [annotationTarget],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode("idle");
        return;
      }

      if (
        annotationTarget?.mode !== "point" ||
        (e.key !== "Enter" && e.key !== " ")
      )
        return;

      const activeElement = document.activeElement;
      const target = activeElement?.closest(annotationTarget.selector);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();
      const rect = target.getBoundingClientRect();
      selectTarget(target, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    },
    [annotationTarget, selectTarget, setMode],
  );

  useEffect(() => {
    if (mode !== "annotating") return;

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("mousedown", suppressEvent, true);
    document.addEventListener("pointerdown", suppressEvent, true);
    document.addEventListener("keydown", handleKeyDown, true);

    const cursorTargets = annotationTarget
      ? Array.from(
          document.querySelectorAll<HTMLElement>(annotationTarget.selector),
        )
      : [document.body];
    const previousAttributes = cursorTargets.map((target) => ({
      ariaLabel: target.getAttribute("aria-label"),
      cursor: target.style.cursor,
      role: target.getAttribute("role"),
      tabIndex: target.getAttribute("tabindex"),
    }));
    cursorTargets.forEach((target) => {
      target.style.cursor = "crosshair";
      if (annotationTarget?.mode === "point") {
        target.setAttribute("aria-label", annotationTarget.label);
        target.setAttribute("role", "button");
        target.setAttribute("tabindex", "0");
      }
    });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mousedown", suppressEvent, true);
      document.removeEventListener("pointerdown", suppressEvent, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      cursorTargets.forEach((target, index) => {
        const previous = previousAttributes[index];
        target.style.cursor = previous?.cursor ?? "";
        restoreAttribute(target, "aria-label", previous?.ariaLabel);
        restoreAttribute(target, "role", previous?.role);
        restoreAttribute(target, "tabindex", previous?.tabIndex);
      });
    };
  }, [
    annotationTarget,
    mode,
    handleMouseMove,
    handleClick,
    suppressEvent,
    handleKeyDown,
  ]);

  if (mode !== "annotating" || !highlightRect) return null;

  return (
    <div
      className={`ff-overlay ${classNames.overlay ?? ""}`}
      data-ff-widget
      style={{
        ...overlayHighlightStyle,
        borderColor: "var(--ff-accent)",
        top: highlightRect.top,
        left: highlightRect.left,
        width: highlightRect.width,
        height: highlightRect.height,
      }}
    />
  );
}

function restoreAttribute(
  element: Element,
  name: string,
  value: string | null | undefined,
) {
  if (value == null) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}
