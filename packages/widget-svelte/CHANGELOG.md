# @fasterfixes/svelte

## 1.0.0

### Major Changes

- [#235](https://github.com/manucoffin/faster-fixes/pull/235) [`3c2e40d`](https://github.com/manucoffin/faster-fixes/commit/3c2e40d1c85a2f03b08b1674525cbe8bbd83701d) Thanks [@manucoffin](https://github.com/manucoffin)! - First release of `@fasterfixes/svelte`, the Svelte Embed of the FasterFixes Widget. Install it with `initFasterFixes({ projectId })` in the script of your root component (the root `+layout.svelte` in SvelteKit) and control the Widget from any component under it with `getFeedback()`, which returns `show`, `hide`, `startAnnotation` and `togglePins`, plus `isVisible`, `feedbackItems` and `showPins` as read-only reactive properties. The install takes the same options as `@fasterfixes/widget`, does nothing during server rendering, destroys the Widget when the root component is destroyed, and ignores a second install under the same root. Requires Svelte 5.7 or later.
