import { appendMarkdown } from "./markdown";
import { isBlankLineSpacesOnly } from "../line_utils";
import type { RtLine } from "../line_utils";

// Newline-gated accumulator that renders markdown and commits only fully
// completed logical lines.
export class MarkdownStreamCollector {
  private buffer = "";
  private committedLineCount = 0;
  private readonly width: number | null;
  private readonly cwd: string;

  constructor(width: number | null, cwd: string) {
    this.width = width;
    this.cwd = cwd;
  }

  clear(): void {
    this.buffer = "";
    this.committedLineCount = 0;
  }

  pushDelta(delta: string): void {
    this.buffer += delta;
  }

  // Render the full buffer and return only the newly completed logical lines
  // since the last commit. When the buffer does not end with a newline, the
  // final rendered line is considered incomplete and is not emitted.
  commitCompleteLines(): RtLine[] {
    const source = this.buffer;
    const lastNewlineIndex = source.lastIndexOf("\n");
    if (lastNewlineIndex === -1) {
      return [];
    }

    const slice = source.slice(0, lastNewlineIndex + 1);
    const rendered: RtLine[] = [];
    appendMarkdown(slice, this.width, this.cwd, rendered);

    let completeLineCount = rendered.length;
    if (completeLineCount > 0 && isBlankLineSpacesOnly(rendered[completeLineCount - 1])) {
      completeLineCount -= 1;
    }

    if (this.committedLineCount >= completeLineCount) {
      return [];
    }

    const out = rendered.slice(this.committedLineCount, completeLineCount);
    this.committedLineCount = completeLineCount;
    return out;
  }

  // Finalize the stream: emit all remaining lines beyond the last commit.
  // If the buffer does not end with a newline, a temporary one is appended
  // for rendering.
  finalizeAndDrain(): RtLine[] {
    let source = this.buffer;
    if (!source.endsWith("\n")) {
      source += "\n";
    }

    const rendered: RtLine[] = [];
    appendMarkdown(source, this.width, this.cwd, rendered);

    const out =
      this.committedLineCount >= rendered.length
        ? []
        : rendered.slice(this.committedLineCount);

    this.clear();
    return out;
  }
}

