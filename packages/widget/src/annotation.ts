import type { AnnotationTarget } from "./options.js";
import type { PinPoint } from "./pin-placement.js";

type AnnotationActions = {
  onSelect: (element: Element, click: PinPoint) => void;
  onCancel: () => void;
};

export type AnnotationMode = {
  start: () => void;
  stop: () => void;
};

// Events from inside the shadow root reach the document retargeted to the
// host, so this also recognises the Widget's own controls.
export function isWidgetEvent(event: Event) {
  return (
    event.target instanceof Element &&
    event.target.closest("[data-ff-widget]") !== null
  );
}

function blockEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

/**
 * While started, highlights the page element under the pointer in `overlay`
 * and turns the next click on the page into a selection instead of reaching
 * the page. Escape cancels.
 */
export function createAnnotationMode(
  document: Document,
  overlay: HTMLElement,
  { onSelect, onCancel }: AnnotationActions,
  target?: AnnotationTarget,
): AnnotationMode {
  let listening: AbortController | null = null;
  let previousCursor = "";
  let restoreTargets: (() => void)[] = [];

  function resolveClickTarget(event: Event) {
    if (!(event.target instanceof Element)) return null;
    return target ? event.target.closest(target.selector) : event.target;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function handleMouseMove(event: MouseEvent) {
    if (
      target?.mode === "point" ||
      isWidgetEvent(event) ||
      !(event.target instanceof Element)
    ) {
      hideOverlay();
      return;
    }
    const rect = event.target.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    overlay.hidden = false;
  }

  function handleClick(event: MouseEvent) {
    if (isWidgetEvent(event)) return;
    const element = resolveClickTarget(event);
    if (!element) return;
    blockEvent(event);
    onSelect(element, { x: event.clientX, y: event.clientY });
  }

  // Without this, a pointer press on the page could close a host dialog or
  // move focus before the click selects the element.
  function handlePress(event: Event) {
    if (isWidgetEvent(event) || !resolveClickTarget(event)) return;
    blockEvent(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
      return;
    }
    if (!target || (event.key !== "Enter" && event.key !== " ")) return;
    const element = document.activeElement?.closest(target.selector);
    if (!element) return;
    blockEvent(event);
    const rect = element.getBoundingClientRect();
    onSelect(element, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return {
    start() {
      if (listening) return;
      listening = new AbortController();
      const options = { capture: true, signal: listening.signal };
      // Captured on the window so they run before any document-level
      // outside-click handler a host dialog or drawer registered first.
      const view = document.defaultView ?? window;
      document.addEventListener("mousemove", handleMouseMove, options);
      view.addEventListener("click", handleClick, options);
      view.addEventListener("mousedown", handlePress, options);
      view.addEventListener("pointerdown", handlePress, options);
      document.addEventListener("keydown", handleKeyDown, options);
      previousCursor = document.body.style.cursor;
      if (target) {
        restoreTargets = [
          ...document.querySelectorAll<HTMLElement>(target.selector),
        ].map((element) => {
          const cursor = element.style.cursor;
          const attributes = ["role", "tabindex", "aria-label"].map(
            (name) => [name, element.getAttribute(name)] as const,
          );
          element.style.cursor = "crosshair";
          element.setAttribute("role", "button");
          element.setAttribute("tabindex", "0");
          element.setAttribute("aria-label", target.label);
          return () => {
            element.style.cursor = cursor;
            attributes.forEach(([name, value]) => {
              if (value === null) element.removeAttribute(name);
              else element.setAttribute(name, value);
            });
          };
        });
      } else document.body.style.cursor = "crosshair";
    },
    stop() {
      if (!listening) return;
      listening.abort();
      listening = null;
      document.body.style.cursor = previousCursor;
      restoreTargets.forEach((restore) => restore());
      restoreTargets = [];
      hideOverlay();
    },
  };
}
