type ScrollLockDocument = {
  documentElement: {
    style: { overflow: string; scrollbarGutter: string };
    clientWidth: number;
  };
  body: { style: { overflow: string } };
  defaultView: { innerWidth: number } | null;
  addEventListener: (
    type: string,
    listener: (event: Event) => void,
    options: AddEventListenerOptions,
  ) => void;
};

export function lockPageScroll(document: ScrollLockDocument) {
  const root = document.documentElement;
  const overflow = root.style.overflow;
  const gutter = root.style.scrollbarGutter;
  const bodyOverflow = document.body.style.overflow;
  const listening = new AbortController();
  const preventScroll = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-ff-widget]")
    ) {
      return;
    }
    event.preventDefault();
  };
  // Reserving a new classic gutter on an overlay-scrollbar page would shrink its content.
  if (
    document.defaultView &&
    document.defaultView.innerWidth > root.clientWidth &&
    (gutter === "" || gutter === "auto")
  ) {
    root.style.scrollbarGutter = "stable";
  }
  root.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.addEventListener("wheel", preventScroll, {
    capture: true,
    passive: false,
    signal: listening.signal,
  });
  document.addEventListener("touchmove", preventScroll, {
    capture: true,
    passive: false,
    signal: listening.signal,
  });
  return () => {
    listening.abort();
    root.style.overflow = overflow;
    root.style.scrollbarGutter = gutter;
    document.body.style.overflow = bodyOverflow;
  };
}
