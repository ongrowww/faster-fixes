/** Where Playwright serves `examples/vue`, next to the web app. */
export const VUE_EXAMPLE_ORIGIN = "http://localhost:3200";
/** Where Playwright serves `examples/angular`. */
export const ANGULAR_EXAMPLE_ORIGIN = "http://localhost:3300";
/** Where Playwright serves `examples/svelte`. */
export const SVELTE_EXAMPLE_ORIGIN = "http://localhost:3400";

/**
 * A page that installs the Widget. Every scenario in `widget.spec.ts` runs
 * once per fixture, so a new Embed is covered by adding an entry here.
 */
type WidgetFixture = {
  name: string;
  /** A path on the web app, or an absolute URL for a page served elsewhere. */
  path: string;
  /** A second page, and the name of the link that reaches it without a reload. */
  otherPage: { path: string; linkName: string };
};

export const WIDGET_FIXTURES: WidgetFixture[] = [
  // The root layout mounts the React Embed; the login page renders it without
  // a database or a cloud-only route.
  {
    name: "app layout (React Embed)",
    path: "/login",
    otherPage: { path: "/signup", linkName: "Sign up" },
  },
  // A static page served by the app outside production, loading the built IIFE
  // under a hostile stylesheet.
  {
    name: "static page (script embed)",
    path: "/e2e/script-embed",
    otherPage: { path: "/e2e/script-embed/second", linkName: "Second page" },
  },
  // The Vue example app, installing the Widget with the Vue Embed plugin.
  {
    name: "example app (Vue Embed)",
    path: `${VUE_EXAMPLE_ORIGIN}/`,
    otherPage: {
      path: `${VUE_EXAMPLE_ORIGIN}/second`,
      linkName: "Second page",
    },
  },
  // The Angular example app, installing the Widget with `provideFasterFixes`.
  {
    name: "example app (Angular Embed)",
    path: `${ANGULAR_EXAMPLE_ORIGIN}/`,
    otherPage: {
      path: `${ANGULAR_EXAMPLE_ORIGIN}/second`,
      linkName: "Second page",
    },
  },
  // The SvelteKit example app, server rendered, installing the Widget with
  // `initFasterFixes` in its root layout.
  {
    name: "example app (Svelte Embed)",
    path: `${SVELTE_EXAMPLE_ORIGIN}/`,
    otherPage: {
      path: `${SVELTE_EXAMPLE_ORIGIN}/second`,
      linkName: "Second page",
    },
  },
];
