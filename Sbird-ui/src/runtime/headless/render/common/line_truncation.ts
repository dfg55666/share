// Phase 1: TUI -> Web semantic port of `line_truncation.rs`.
//
// The upstream version operates on Ratatui `Line`/`Span` with unicode-width.
// Here we keep compatible data shapes and approximate width by grapheme count.

export type Span = {
  content: string;
  // Style is intentionally opaque in Phase 1.
  style?: unknown;
};

export type Line = {
  spans: Span[];
  style?: unknown;
  alignment?: unknown;
};

function graphemeWidth(text: string): number {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg(undefined, { granularity: "grapheme" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(text) as any).length;
  }
  return Array.from(text).length;
}

export function line_width(line: Line): number {
  return line.spans.reduce((sum, s) => sum + graphemeWidth(s.content), 0);
}

export function truncate_line_to_width(line: Line, max_width: number): Line {
  if (max_width <= 0) return { ...line, spans: [] };
  let used = 0;
  const out: Span[] = [];

  for (const span of line.spans) {
    if (!span.content) {
      out.push(span);
      continue;
    }
    if (used >= max_width) break;

    const w = graphemeWidth(span.content);
    if (used + w <= max_width) {
      used += w;
      out.push(span);
      continue;
    }

    // Truncate inside this span.
    const allowed = max_width - used;
    if (allowed > 0) {
      const chars = Array.from(span.content).slice(0, allowed).join("");
      out.push({ ...span, content: chars });
    }
    break;
  }

  return { ...line, spans: out };
}

export function truncate_line_with_ellipsis_if_overflow(
  line: Line,
  max_width: number,
): Line {
  if (max_width <= 0) return { ...line, spans: [] };
  if (line_width(line) <= max_width) return line;

  const truncated = truncate_line_to_width(line, Math.max(0, max_width - 1));
  const spans = [...truncated.spans];
  const lastStyle = spans.at(-1)?.style;
  spans.push({ content: "…", style: lastStyle });
  return { ...truncated, spans };
}

