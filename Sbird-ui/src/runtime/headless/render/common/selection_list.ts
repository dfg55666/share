// Phase 1: TUI -> Web semantic port of `selection_list.rs`.
//
// The Rust implementation returns `Renderable` rows for selection menus.
// In the web runtime we keep the same row construction boundary, but the
// actual DOM rendering is handled by React (Phase 2). For Phase 1 we emit a
// lightweight Renderable that returns a structured model.

import type { Renderable, Rect } from "../renderable";

export type SelectionOptionRowModel = {
  kind: "selection_option_row";
  index: number;
  prefix: string;
  label: string;
  selected: boolean;
  dim: boolean;
  style: {
    fg?: string;
    dim?: boolean;
    bold?: boolean;
  };
};

function stringWidth(text: string): number {
  // Terminal-width approximation. Good enough for Phase 1 since prefix content
  // is ASCII + a single arrow glyph.
  return [...text].length;
}

function wrappedLineCount(text: string, width: number): number {
  const w = Math.max(1, Math.floor(width));
  const len = stringWidth(text);
  return Math.max(1, Math.ceil(len / w));
}

class SelectionOptionRowRenderable implements Renderable {
  private readonly model: SelectionOptionRowModel;
  private readonly prefixWidth: number;

  constructor(model: SelectionOptionRowModel) {
    this.model = model;
    this.prefixWidth = stringWidth(model.prefix);
  }

  desiredHeight(width: number): number {
    const contentWidth = Math.max(1, Math.floor(width) - this.prefixWidth);
    return wrappedLineCount(this.model.label, contentWidth);
  }

  render(_area: Rect): unknown {
    return this.model;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function selection_option_row(
  index: number,
  label: string,
  is_selected: boolean,
): Renderable {
  return selection_option_row_with_dim(index, label, is_selected, /*dim*/ false);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function selection_option_row_with_dim(
  index: number,
  label: string,
  is_selected: boolean,
  dim: boolean,
): Renderable {
  const prefix = is_selected ? `› ${index + 1}. ` : `  ${index + 1}. `;
  const style = is_selected ? { fg: "rgb(0, 194, 194)", bold: true } : dim ? { dim: true } : {};
  return new SelectionOptionRowRenderable({
    kind: "selection_option_row",
    index,
    prefix,
    label,
    selected: is_selected,
    dim,
    style,
  });
}
