// Port of `tuitoweb/src/render/mod.rs`.
//
// Keep a single renderer boundary so call sites can import from `render/*` the
// same way as the TUI module tree.

export const modulePath = "render";

export type { DiffScopeBackgroundRgbs, CodeHighlightResult } from "./highlight";
export {
  diffScopeBackgroundRgbs,
  exceedsHighlightLimits,
  highlightCodeToLines,
  highlightCodeToStyledSpans,
} from "./highlight";

export type { RtLine, RtSpan, RtStyle, RtText } from "./line_utils";
export { cloneLine, isBlankLineSpacesOnly, prefixLines, pushOwnedLines } from "./line_utils";

export type { CursorPos, Rect, Renderable, RenderableItem } from "./renderable";
export { ColumnRenderable } from "./renderable";

export * from "./common";
