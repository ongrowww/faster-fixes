# @fasterfixes/angular

## 1.0.0

### Major Changes

- [#223](https://github.com/manucoffin/faster-fixes/pull/223) [`ddac759`](https://github.com/manucoffin/faster-fixes/commit/ddac7594804e0dd0dbefaf18ea44e57889964c9f) Thanks [@manucoffin](https://github.com/manucoffin)! - First release of `@fasterfixes/angular`, the Angular Embed of the FasterFixes Widget. Install it with `provideFasterFixes({ projectId })` in the providers of your application config and control the Widget from any injection context with `injectFeedback()`, which returns `show`, `hide`, `startAnnotation` and `togglePins`, plus `isVisible`, `feedbackItems` and `showPins` as read-only signals. The provider takes the same options as `@fasterfixes/widget`, does nothing during server rendering, destroys the Widget when the application is destroyed, and ignores a second provider in the same application. Requires Angular 19 or later.
