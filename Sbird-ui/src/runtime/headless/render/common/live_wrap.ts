// Phase 1: TUI -> Web semantic port of `live_wrap.rs`.
//
// This file provides an incremental wrapper that turns incoming text fragments
// into display rows, keeping a small tail buffered. Width is approximated in
// graphemes (not terminal cells).

function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg(undefined, { granularity: "grapheme" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(text) as any, (s: any) => s.segment as string);
  }
  return Array.from(text);
}

export type Row = {
  text: string;
  explicit_break: boolean;
};

export function row_width(row: Row): number {
  return graphemes(row.text).length;
}

export function take_prefix_by_width(
  text: string,
  max_cols: number,
): [prefix: string, suffix: string, prefix_width: number] {
  if (max_cols <= 0 || !text) return ["", text, 0];

  const gs = graphemes(text);
  const prefixGs = gs.slice(0, max_cols);
  const prefix = prefixGs.join("");
  const suffix = gs.slice(prefixGs.length).join("");
  return [prefix, suffix, prefixGs.length];
}

export class RowBuilder {
  private target_width: number;
  private current_line = "";
  private rows_out: Row[] = [];

  constructor(target_width: number) {
    this.target_width = Math.max(1, target_width);
  }

  width(): number {
    return this.target_width;
  }

  set_width(width: number): void {
    this.target_width = Math.max(1, width);

    // Rewrap everything we have (simple approach mirroring Rust Step 1).
    let all = "";
    for (const row of this.rows_out) {
      all += row.text;
      if (row.explicit_break) all += "\n";
    }
    all += this.current_line;
    this.rows_out = [];
    this.current_line = "";
    this.push_fragment(all);
  }

  push_fragment(fragment: string): void {
    if (!fragment) return;

    let start = 0;
    for (let i = 0; i < fragment.length; i += 1) {
      if (fragment[i] === "\n") {
        if (start < i) this.current_line += fragment.slice(start, i);
        this.flush_current_line(true);
        start = i + 1;
      }
    }
    if (start < fragment.length) {
      this.current_line += fragment.slice(start);
      this.wrap_current_line();
    }
  }

  end_line(): void {
    this.flush_current_line(true);
  }

  drain_rows(): Row[] {
    const out = this.rows_out;
    this.rows_out = [];
    return out;
  }

  rows(): readonly Row[] {
    return this.rows_out;
  }

  display_rows(): Row[] {
    const out = [...this.rows_out];
    if (this.current_line) {
      out.push({ text: this.current_line, explicit_break: false });
    }
    return out;
  }

  drain_commit_ready(max_keep: number): Row[] {
    const displayCount = this.rows_out.length + (this.current_line ? 1 : 0);
    if (displayCount <= max_keep) return [];

    const toCommit = displayCount - max_keep;
    const commitCount = Math.min(toCommit, this.rows_out.length);
    return this.rows_out.splice(0, commitCount);
  }

  private flush_current_line(explicit_break: boolean): void {
    this.wrap_current_line();

    if (explicit_break) {
      if (!this.current_line) {
        this.rows_out.push({ text: "", explicit_break: true });
      } else {
        this.rows_out.push({ text: this.current_line, explicit_break: true });
      }
    }

    this.current_line = "";
  }

  private wrap_current_line(): void {
    for (;;) {
      if (!this.current_line) return;
      const [prefix, suffix, taken] = take_prefix_by_width(
        this.current_line,
        this.target_width,
      );

      if (taken === 0) {
        // Avoid infinite loop: take at least one code point.
        const first = Array.from(this.current_line)[0];
        if (!first) return;
        this.rows_out.push({ text: first, explicit_break: false });
        this.current_line = this.current_line.slice(first.length);
        continue;
      }

      if (!suffix) {
        // Fits in buffer; keep for later appends.
        return;
      }

      this.rows_out.push({ text: prefix, explicit_break: false });
      this.current_line = suffix;
    }
  }
}

