export type RtStyle = {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  clampLines?: number;
};

export type RtSpan = {
  style?: RtStyle;
  content: string;
};

export type RtLine = {
  style?: RtStyle;
  spans: RtSpan[];
};

export type RtText = {
  lines: RtLine[];
};

export function cloneLine(line: RtLine): RtLine {
  return {
    style: line.style ? { ...line.style } : undefined,
    spans: line.spans.map((span) => ({
      style: span.style ? { ...span.style } : undefined,
      content: span.content,
    })),
  };
}

export function pushOwnedLines(src: RtLine[], out: RtLine[]): void {
  for (const line of src) {
    out.push(cloneLine(line));
  }
}

export function isBlankLineSpacesOnly(line: RtLine): boolean {
  if (!line.spans.length) {
    return true;
  }
  return line.spans.every((span) => span.content === "" || /^[ ]*$/.test(span.content));
}

export function prefixLines(
  lines: RtLine[],
  initialPrefix: RtSpan,
  subsequentPrefix: RtSpan,
): RtLine[] {
  return lines.map((line, idx) => ({
    style: line.style,
    spans: [
      idx === 0 ? { ...initialPrefix } : { ...subsequentPrefix },
      ...line.spans.map((span) => ({ ...span })),
    ],
  }));
}

