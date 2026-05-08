import type { RtLine, RtSpan, RtStyle } from "../line_utils";

export type DiffLineType = "insert" | "delete" | "context" | "meta";

export type UnifiedDiffLine = {
  type: DiffLineType;
  leftLineNo?: number;
  rightLineNo?: number;
  content: string;
};

const styles = {
  insert: { fg: "rgb(30, 120, 30)", bg: "rgba(218, 251, 225, 0.85)" } satisfies RtStyle,
  delete: { fg: "rgb(150, 30, 30)", bg: "rgba(255, 235, 233, 0.85)" } satisfies RtStyle,
  meta: { fg: "rgb(120, 120, 120)", dim: true } satisfies RtStyle,
};

function padLeft(value: string, width: number): string {
  if (value.length >= width) return value;
  return " ".repeat(width - value.length) + value;
}

function formatNo(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(value);
}

function toRtLine(line: UnifiedDiffLine, noWidth: number): RtLine {
  const sign = line.type === "insert" ? "+" : line.type === "delete" ? "-" : line.type === "context" ? " " : "·";
  const left = padLeft(formatNo(line.leftLineNo), noWidth);
  const right = padLeft(formatNo(line.rightLineNo), noWidth);
  const header = `${left} ${right} ${sign} `;

  const spanStyle =
    line.type === "insert"
      ? styles.insert
      : line.type === "delete"
        ? styles.delete
        : line.type === "meta"
          ? styles.meta
          : undefined;

  const spans: RtSpan[] = [{ content: header, style: styles.meta }, { content: line.content, style: spanStyle }];
  return { spans, style: spanStyle };
}

function parseHunkHeader(line: string): { leftStart: number; rightStart: number } | null {
  // @@ -l,s +r,s @@
  const match = /^@@\s+-([0-9]+)(?:,[0-9]+)?\s+\+([0-9]+)(?:,[0-9]+)?\s+@@/.exec(line);
  if (!match) return null;
  return { leftStart: Number(match[1]), rightStart: Number(match[2]) };
}

export function parseUnifiedDiff(diffText: string): UnifiedDiffLine[] {
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  const out: UnifiedDiffLine[] = [];

  let leftNo = 0;
  let rightNo = 0;
  let inHunk = false;

  for (const raw of lines) {
    if (raw.startsWith("@@")) {
      const parsed = parseHunkHeader(raw);
      if (parsed) {
        leftNo = parsed.leftStart;
        rightNo = parsed.rightStart;
        inHunk = true;
      }
      out.push({ type: "meta", content: raw });
      continue;
    }

    if (
      raw.startsWith("diff --git") ||
      raw.startsWith("index ") ||
      raw.startsWith("--- ") ||
      raw.startsWith("+++ ")
    ) {
      out.push({ type: "meta", content: raw });
      continue;
    }

    if (!inHunk) {
      // Keep anything else as meta until first hunk header.
      out.push({ type: "meta", content: raw });
      continue;
    }

    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      out.push({ type: "insert", rightLineNo: rightNo, content: raw.slice(1) });
      rightNo += 1;
      continue;
    }
    if (raw.startsWith("-") && !raw.startsWith("---")) {
      out.push({ type: "delete", leftLineNo: leftNo, content: raw.slice(1) });
      leftNo += 1;
      continue;
    }
    if (raw.startsWith(" ")) {
      out.push({
        type: "context",
        leftLineNo: leftNo,
        rightLineNo: rightNo,
        content: raw.slice(1),
      });
      leftNo += 1;
      rightNo += 1;
      continue;
    }
    if (raw.startsWith("\\ No newline at end of file")) {
      out.push({ type: "meta", content: raw });
      continue;
    }

    out.push({ type: "meta", content: raw });
  }

  return out;
}

export function renderUnifiedDiff(diffText: string): RtLine[] {
  const parsed = parseUnifiedDiff(diffText);
  const maxNo = parsed.reduce((max, line) => {
    const candidate = Math.max(line.leftLineNo ?? 0, line.rightLineNo ?? 0);
    return Math.max(max, candidate);
  }, 0);
  const width = Math.max(2, String(maxNo || 0).length);
  return parsed.map((line) => toRtLine(line, width));
}

