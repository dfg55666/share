import { highlightCodeToLines } from "../highlight";
import type { RtLine, RtSpan, RtStyle, RtText } from "../line_utils";

export type MarkdownRenderResult = RtText;

const styles = {
  heading: { bold: true } satisfies RtStyle,
  code: { fg: "rgb(0, 194, 194)" } satisfies RtStyle,
  emphasis: { italic: true } satisfies RtStyle,
  strong: { bold: true } satisfies RtStyle,
  orderedListMarker: { fg: "rgb(80, 170, 255)" } satisfies RtStyle,
  link: { fg: "rgb(0, 194, 194)", underline: true } satisfies RtStyle,
  blockquote: { fg: "rgb(60, 160, 60)" } satisfies RtStyle,
};

function isLocalPathLikeLink(dest: string): boolean {
  const trimmed = dest.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("file://")) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) return true;
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) return true;
  return false;
}

function relativizePath(target: string, cwd?: string): string {
  const clean = target.replace(/^file:\/\//, "");
  if (!cwd) return clean;
  const normalizedCwd = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalized = clean.replace(/\\/g, "/");
  if (normalized.startsWith(normalizedCwd + "/")) {
    return normalized.slice(normalizedCwd.length + 1);
  }
  return normalized;
}

function renderInlineMarkdown(text: string, cwd?: string): RtSpan[] {
  // Minimal inline parser:
  // - local links: show destination text instead of label
  // - web links: show label, optionally append destination
  const spans: RtSpan[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;

  while (true) {
    const match = linkRe.exec(text);
    if (!match) break;

    const [full, labelRaw, destRaw] = match;
    const idx = match.index;
    if (idx > last) {
      spans.push({ content: text.slice(last, idx) });
    }
    const label = labelRaw ?? "";
    const dest = destRaw ?? "";

    if (isLocalPathLikeLink(dest)) {
      const display = relativizePath(dest, cwd);
      spans.push({ content: display, style: styles.link });
    } else {
      spans.push({ content: label, style: styles.link });
      // Keep destination as plain text if it's different and caller provided it in markdown.
      if (dest.trim() && dest.trim() !== label.trim()) {
        spans.push({ content: ` (${dest.trim()})` });
      }
    }

    last = idx + full.length;
  }

  if (last < text.length) {
    spans.push({ content: text.slice(last) });
  }

  return spans.length ? spans : [{ content: text }];
}

function plainLine(text: string, cwd?: string, lineStyle?: RtStyle): RtLine {
  return {
    style: lineStyle,
    spans: renderInlineMarkdown(text, cwd),
  };
}

function renderListMarker(line: string): { marker: string; rest: string; ordered: boolean } | null {
  const ordered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (ordered) {
    const [, indent, num, rest] = ordered;
    return { marker: `${indent}${num}. `, rest, ordered: true };
  }
  const unordered = /^(\s*)([-*+])\s+(.*)$/.exec(line);
  if (unordered) {
    const [, indent, bullet, rest] = unordered;
    return { marker: `${indent}${bullet} `, rest, ordered: false };
  }
  return null;
}

export function renderMarkdownTextWithWidthAndCwd(
  input: string,
  width: number | null,
  cwd?: string | null,
): MarkdownRenderResult {
  // This is intentionally not a full markdown renderer yet. Phase 1 needs the
  // same stream/commit semantics and stable text output; terminal styling and
  // full Markdown spec coverage can be layered later.
  //
  // Rules preserved vs TUI:
  // - citations like 【...†L1】 stay as plain text
  // - indented code blocks keep leading whitespace
  // - ordered list marker stays on the same line as text ("1. item")
  const renderCwd = cwd ?? undefined;
  const lines: RtLine[] = [];

  let inFence = false;
  let fenceLang = "";
  const rawLines = input.replace(/\r\n/g, "\n").split("\n");

  for (const raw of rawLines) {
    const fence = /^```(\w+)?\s*$/.exec(raw);
    if (fence) {
      inFence = !inFence;
      fenceLang = fence[1] ?? "";
      // Keep fence line itself visible to match user expectation.
      lines.push(plainLine(raw, renderCwd));
      continue;
    }

    if (inFence) {
      const highlighted = highlightCodeToLines(raw, fenceLang);
      if (highlighted) {
        lines.push(...highlighted.lines);
      } else {
        lines.push({ spans: [{ content: raw, style: styles.code }] });
      }
      continue;
    }

    // Indented code block: keep exactly as-is.
    if (/^ {4,}\S/.test(raw)) {
      lines.push({ spans: [{ content: raw, style: styles.code }] });
      continue;
    }

    // Headings.
    if (/^#{1,6}\s+/.test(raw)) {
      lines.push(plainLine(raw, renderCwd, styles.heading));
      continue;
    }

    // Blockquotes: style the whole line but keep text.
    if (/^\s*>/.test(raw)) {
      const withoutMarker = raw.replace(/^\s*> ?/, "");
      lines.push(plainLine(withoutMarker, renderCwd, styles.blockquote));
      continue;
    }

    // Lists: render marker separately but keep single-line output.
    const list = renderListMarker(raw);
    if (list) {
      const markerStyle = list.ordered ? styles.orderedListMarker : undefined;
      const spans: RtSpan[] = [
        { content: list.marker, style: markerStyle },
        ...renderInlineMarkdown(list.rest, renderCwd),
      ];
      lines.push({ spans });
      continue;
    }

    lines.push(plainLine(raw, renderCwd));
  }

  // Width-based wrapping is intentionally minimal for now.
  if (typeof width === "number" && Number.isFinite(width) && width > 0) {
    return { lines: hardWrapLines(lines, width) };
  }

  return { lines };
}

export function renderMarkdownText(input: string): MarkdownRenderResult {
  return renderMarkdownTextWithWidthAndCwd(input, null, null);
}

function hardWrapLines(lines: RtLine[], width: number): RtLine[] {
  const out: RtLine[] = [];
  for (const line of lines) {
    const text = line.spans.map((s) => s.content).join("");
    if (text.length <= width) {
      out.push(line);
      continue;
    }
    // Hard wrap by code unit count. This is not unicode-width aware, but is
    // sufficient for Phase 1 scaffolding.
    let offset = 0;
    while (offset < text.length) {
      const slice = text.slice(offset, offset + width);
      out.push({ spans: [{ content: slice, style: line.style }] });
      offset += width;
    }
  }
  return out;
}

