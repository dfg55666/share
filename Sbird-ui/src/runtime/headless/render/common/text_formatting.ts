// Phase 1: TUI -> Web semantic port of `text_formatting.rs`.
//
// Terminal cell-width accounting (unicode-width) is approximated in the browser.

function graphemes(text: string): string[] {
  // Intl.Segmenter provides correct grapheme boundaries in modern browsers.
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg(undefined, { granularity: "grapheme" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(text) as any, (s: any) => s.segment as string);
  }
  // Fallback: code points (may split multi-codepoint graphemes).
  return Array.from(text);
}

function isWideCodePoint(codePoint: number): boolean {
  // Best-effort approximation of terminal cell width for common wide glyphs (CJK, emoji).
  // This errs slightly towards "wider" so truncation doesn't wrap past the TUI budget.
  return (
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x1100 &&
      (codePoint <= 0x115f || // Hangul Jamo init. consonants
        (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) || // CJK ... Yi
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Hangul Syllables
        (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK Compatibility Ideographs
        (codePoint >= 0xfe10 && codePoint <= 0xfe19) || // Vertical forms
        (codePoint >= 0xfe30 && codePoint <= 0xfe6f) || // CJK Compatibility Forms
        (codePoint >= 0xff00 && codePoint <= 0xff60) || // Fullwidth Forms
        (codePoint >= 0xffe0 && codePoint <= 0xffe6) || // Fullwidth symbol variants
        (codePoint >= 0x20000 && codePoint <= 0x3fffd) || // CJK Unified Ideographs Extensions
        (codePoint >= 0x1f300 && codePoint <= 0x1f64f) || // Emoji
        (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) || // Emoji (supplemental)
        (codePoint >= 0x1fa70 && codePoint <= 0x1faf6))) // Emoji (extended)
  );
}

function graphemeCellWidth(grapheme: string): number {
  const codePoint = grapheme.codePointAt(0);
  if (codePoint === undefined) return 0;

  // Control characters take no terminal cells.
  if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
    return 0;
  }

  return isWideCodePoint(codePoint) ? 2 : 1;
}

function takeByCellWidth(gs: string[], maxCells: number): string {
  if (maxCells <= 0) return "";
  let out = "";
  let used = 0;
  for (const g of gs) {
    const w = graphemeCellWidth(g);
    if (used + w > maxCells) break;
    out += g;
    used += w;
  }
  return out;
}

function takeTailByCellWidth(gs: string[], maxCells: number): string {
  if (maxCells <= 0) return "";
  let used = 0;
  const parts: string[] = [];
  for (let i = gs.length - 1; i >= 0; i -= 1) {
    const g = gs[i]!;
    const w = graphemeCellWidth(g);
    if (used + w > maxCells) break;
    parts.push(g);
    used += w;
  }
  return parts.reverse().join("");
}

export function capitalize_first(input: string): string {
  if (!input) return "";
  const [first, ...rest] = Array.from(input);
  return first ? first.toUpperCase() + rest.join("") : "";
}

export function format_json_compact(text: string): string | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }

  let pretty: string;
  try {
    pretty = JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }

  // Convert multi-line pretty JSON to compact single-line format by removing
  // newlines and excess whitespace. Keep a single space after ':' and ','
  // when useful for wrapping in fixed-width renderers.
  let out = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < pretty.length; i += 1) {
    const ch = pretty[i]!;

    if (ch === '"' && !escapeNext) {
      inString = !inString;
      out += ch;
      continue;
    }

    if (ch === "\\" && inString) {
      escapeNext = !escapeNext;
      out += ch;
      continue;
    }

    if (!inString && (ch === "\n" || ch === "\r")) {
      continue;
    }

    if (!inString && (ch === " " || ch === "\t")) {
      const next = pretty[i + 1];
      const last = out.at(-1);
      if (next && last && (last === ":" || last === ",") && next !== "}" && next !== "]") {
        out += " ";
      }
      continue;
    }

    if (escapeNext && inString) {
      escapeNext = false;
    }

    out += ch;
  }

  return out;
}

export function truncate_text(text: string, max_graphemes: number): string {
  const maxCells = Math.max(0, Math.floor(max_graphemes));
  if (maxCells <= 0) return "";
  const gs = graphemes(text);

  // Fast-path: see if the full string fits in the cell budget.
  let used = 0;
  let fits = true;
  for (const g of gs) {
    used += graphemeCellWidth(g);
    if (used > maxCells) {
      fits = false;
      break;
    }
  }
  if (fits) return text;

  if (maxCells >= 3) {
    return takeByCellWidth(gs, maxCells - 3) + "...";
  }
  return takeByCellWidth(gs, maxCells);
}

export function format_and_truncate_tool_result(
  text: string,
  max_lines: number,
  line_width: number,
): string {
  const maxCells = Math.max(0, max_lines * line_width - max_lines);
  const formatted = format_json_compact(text);
  if (formatted !== undefined) {
    return truncate_text(formatted, maxCells);
  }
  const compacted = text.replace(/\r\n|\n|\r/g, " ↵ ");
  return truncate_text(compacted, maxCells);
}

export function center_truncate_path(path: string, max_width: number): string {
  if (max_width <= 0) return "";
  if (max_width === 1) return "…";
  const gs = graphemes(path);

  let used = 0;
  let fits = true;
  for (const g of gs) {
    used += graphemeCellWidth(g);
    if (used > max_width) {
      fits = false;
      break;
    }
  }
  if (fits) return path;

  const keep = max_width - 1;
  const left = Math.floor(keep / 2);
  const right = keep - left;
  return takeByCellWidth(gs, left) + "…" + takeTailByCellWidth(gs, right);
}

