export { appendMarkdown } from "./markdown";
export type { MarkdownRenderResult } from "./markdown_render";
export { renderMarkdownText, renderMarkdownTextWithWidthAndCwd } from "./markdown_render";
export { runMarkdownRenderSelfTest } from "./markdown_render_tests";
export { MarkdownStreamCollector } from "./markdown_stream";

export { parseUnifiedDiff, renderUnifiedDiff } from "./diff_render";
export type { DiffLineType, UnifiedDiffLine } from "./diff_render";

export {
  capitalize_first,
  center_truncate_path,
  format_and_truncate_tool_result,
  format_json_compact,
  truncate_text,
} from "./text_formatting";

export { splitCommandString, stripBashLcAndEscape, relativizeToHome } from "./exec_command";
export * from "./exec_cell";

export {
  STATUS_DETAILS_DEFAULT_MAX_LINES,
  StatusIndicatorWidget,
  fmtElapsedCompact,
} from "./status_indicator_widget";

export type { Rgb } from "./color";
export { blend, isLight, perceptualDistance } from "./color";
export { proposedPlanStyle, proposedPlanStyleFor, userMessageStyle, userMessageStyleFor } from "./style";

export { line_width, truncate_line_to_width, truncate_line_with_ellipsis_if_overflow } from "./line_truncation";
export type { Line as TruncationLine, Span as TruncationSpan } from "./line_truncation";

export { adaptive_wrap_line, line_contains_url_like, text_contains_url_like, wrap_ranges } from "./wrapping";
export type { Line as WrappedLine, RtOptions, Span as WrappedSpan } from "./wrapping";

export { RowBuilder, row_width, take_prefix_by_width } from "./live_wrap";
export type { Row } from "./live_wrap";

export { selection_option_row, selection_option_row_with_dim } from "./selection_list";
export type { SelectionOptionRowModel } from "./selection_list";

export { shimmer_spans } from "./shimmer";
export type { ShimmerSpan } from "./shimmer";

export { announcement, getTooltip, parseAnnouncementTipToml } from "./tooltips";
