# @fasterfixes/vue

## 1.0.0

### Major Changes

- [#214](https://github.com/manucoffin/faster-fixes/pull/214) [`1bdc0a2`](https://github.com/manucoffin/faster-fixes/commit/1bdc0a253a9ff9e22ef234bbbb7236e3c55ac65c) Thanks [@manucoffin](https://github.com/manucoffin)! - First release of `@fasterfixes/vue`, the Vue Embed of the FasterFixes Widget. Install it with `app.use(createFasterFixes({ projectId }))` and control the Widget from any component with `useFeedback()`, which returns `show`, `hide`, `startAnnotation` and `togglePins`, plus `isVisible`, `feedbackItems` and `showPins` as readonly refs. The plugin takes the same options as `@fasterfixes/widget`, does nothing during server rendering, destroys the Widget when the app unmounts, and ignores a second install on the same app. Requires Vue 3.5 or later.

### Patch Changes

- Updated dependencies [[`195b1aa`](https://github.com/manucoffin/faster-fixes/commit/195b1aaa084b64b741b092805e7d6f2450847e25), [`3e86fca`](https://github.com/manucoffin/faster-fixes/commit/3e86fcaea1d1e984aa0276182c190ee479ff9c65)]:
  - @fasterfixes/widget@1.2.0
