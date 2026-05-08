import type { RtLine, RtSpan, RtStyle } from "./line_utils";

export type DiffScopeBackgroundRgbs = {
  inserted?: [number, number, number];
  deleted?: [number, number, number];
};

export type CodeHighlightResult = {
  lines: RtLine[];
};

const MAX_HIGHLIGHT_BYTES = 512 * 1024;
const MAX_HIGHLIGHT_LINES = 10_000;

function styleOf(kind: "code" | "diff_add" | "diff_del"): RtStyle {
  if (kind === "code") {
    return { fg: "rgb(0, 194, 194)" };
  }
  if (kind === "diff_add") {
    return { fg: "rgb(30, 120, 30)", bg: "rgba(218, 251, 225, 0.85)" };
  }
  return { fg: "rgb(150, 30, 30)", bg: "rgba(255, 235, 233, 0.85)" };
}

export function exceedsHighlightLimits(source: string): boolean {
  if (source.length > MAX_HIGHLIGHT_BYTES) return true;
  const lineCount = source.split("\n").length;
  return lineCount > MAX_HIGHLIGHT_LINES;
}

// No real syntax highlighting in Phase 1 (no deps). We still keep the API shape
// so later we can drop in a real highlighter.
export function highlightCodeToLines(
  source: string,
  _language?: string,
): CodeHighlightResult | null {
  if (exceedsHighlightLimits(source)) {
    return null;
  }
  const lines = source.split("\n").map<RtLine>((content) => ({
    spans: [{ content, style: styleOf("code") }],
  }));
  return { lines };
}

export function highlightCodeToStyledSpans(
  line: string,
  _language?: string,
): RtSpan[] {
  return [{ content: line, style: styleOf("code") }];
}

export function diffScopeBackgroundRgbs(): DiffScopeBackgroundRgbs {
  // Browser build has no access to the syntect theme registry. Keep as empty so
  // diff rendering falls back to its own palette.
  return {};
}

