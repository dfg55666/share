// Phase 1: TUI -> Web semantic port of `wrapping.rs`.
//
// The Rust implementation is URL-aware and uses `textwrap` + unicode width.
// In the browser we keep the same public surface, but wrapping is simplified
// (grapheme-count width and basic whitespace wrapping). This is sufficient for
// Phase 1 cursor/range mapping and can be refined later.

export type Span = { content: string; style?: unknown };
export type Line = { spans: Span[]; style?: unknown; alignment?: unknown };

export class RtOptions {
  readonly width: number;
  constructor(width: number) {
    this.width = Math.max(1, width);
  }

  static new(width: number): RtOptions {
    return new RtOptions(width);
  }
}

function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg(undefined, { granularity: "grapheme" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(text) as any, (s: any) => s.segment as string);
  }
  return Array.from(text);
}

function isUrlLikeToken(rawToken: string): boolean {
  const token = trimUrlToken(rawToken);
  if (!token) return false;
  return isAbsoluteUrlLike(token) || isBareUrlLike(token);
}

function trimUrlToken(token: string): string {
  return token.replace(/^[\[\]{}()<>,.;:!'"\\s]+|[\[\]{}()<>,.;:!'"\\s]+$/g, "");
}

function isAbsoluteUrlLike(token: string): boolean {
  return token.includes("://");
}

function isBareUrlLike(token: string): boolean {
  // Heuristic: localhost(:port) or ipv4(:port) or domain.tld
  const host = token.split(/[/?#]/)[0] ?? "";
  if (!host) return false;
  if (/^localhost(:\\d+)?$/i.test(host)) return true;
  if (/^(\\d{1,3}\\.){3}\\d{1,3}(:\\d+)?$/.test(host)) return true;
  if (/^[a-z0-9.-]+\\.[a-z]{2,}(:\\d+)?$/i.test(host)) return true;
  return false;
}

function isDecorativeMarkerToken(raw: string, trimmed: string): boolean {
  const r = raw.trim();
  if (r === "-" || r === "*" || r === "|" || r === "│") return true;
  if (/^\\d+\\.$/.test(r)) return true;
  if (!trimmed) return true;
  return false;
}

export function text_contains_url_like(text: string): boolean {
  return text.split(/\s+/).some(isUrlLikeToken);
}

export function line_contains_url_like(line: Line): boolean {
  const text = line.spans.map((s) => s.content).join("");
  return text_contains_url_like(text);
}

export function line_has_mixed_url_and_non_url_tokens(line: Line): boolean {
  const text = line.spans.map((s) => s.content).join("");
  let sawUrl = false;
  let sawNonUrl = false;
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    const trimmed = trimUrlToken(raw);
    if (isUrlLikeToken(raw)) {
      sawUrl = true;
    } else if (!isDecorativeMarkerToken(raw, trimmed) && /[a-z0-9]/i.test(trimmed)) {
      sawNonUrl = true;
    }
    if (sawUrl && sawNonUrl) return true;
  }
  return false;
}

function wrapLineToRanges(line: string, width: number): Array<[start: number, end: number]> {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  const gs = graphemes(line);

  while (cursor < gs.length) {
    const slice = gs.slice(cursor);
    if (slice.length <= width) {
      const startIdx = gs.slice(0, cursor).join("").length;
      const endIdx = line.length;
      ranges.push([startIdx, endIdx]);
      break;
    }

    const chunk = slice.slice(0, width);
    // Prefer breaking at the last whitespace inside the chunk.
    let breakAt = chunk.length;
    for (let i = chunk.length - 1; i >= 0; i -= 1) {
      if (/\\s/.test(chunk[i]!)) {
        breakAt = i + 1;
        break;
      }
    }

    if (breakAt <= 0) breakAt = width;
    const startIdx = gs.slice(0, cursor).join("").length;
    const endIdx = gs.slice(0, cursor + breakAt).join("").length;
    ranges.push([startIdx, endIdx]);
    cursor += breakAt;
  }

  return ranges;
}

export function wrap_ranges(text: string, widthOrOptions: number | RtOptions): Range[] {
  const width = typeof widthOrOptions === "number" ? widthOrOptions : widthOrOptions.width;
  const out: Range[] = [];

  let base = 0;
  for (const logicalLine of text.split("\n")) {
    const ranges = wrapLineToRanges(logicalLine, Math.max(1, width));
    if (ranges.length === 0) {
      out.push({ start: base, end: base + 1 });
      base += logicalLine.length + 1;
      continue;
    }

    for (const [s, e] of ranges) {
      out.push({ start: base + s, end: base + e + 1 });
    }
    base += logicalLine.length + 1;
  }

  return out;
}

export function wrap_ranges_trim(text: string, widthOrOptions: number | RtOptions): Range[] {
  const width = typeof widthOrOptions === "number" ? widthOrOptions : widthOrOptions.width;
  const out: Range[] = [];

  let base = 0;
  for (const logicalLine of text.split("\n")) {
    const ranges = wrapLineToRanges(logicalLine, Math.max(1, width));
    if (ranges.length === 0) {
      out.push({ start: base, end: base });
      base += logicalLine.length + 1;
      continue;
    }

    for (const [s, e] of ranges) {
      out.push({ start: base + s, end: base + e });
    }
    base += logicalLine.length + 1;
  }

  return out;
}

export type Range = { start: number; end: number };

export function word_wrap_line(line: Line, opts: RtOptions): Line[] {
  return adaptive_wrap_line(line, opts);
}

export function adaptive_wrap_line(line: Line, opts: RtOptions): Line[] {
  const text = line.spans.map((s) => s.content).join("");
  const ranges = wrap_ranges_trim(text, opts);
  return ranges.map((r) => ({
    spans: [{ content: text.slice(r.start, r.end) }],
  }));
}

