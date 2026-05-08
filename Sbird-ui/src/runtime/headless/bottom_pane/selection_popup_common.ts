// Web port of `tuitoweb/src/bottom_pane/selection_popup_common.rs`.
//
// Rust-side helper focuses on row measurement + rendering for list-like popups.
// In web we keep the same headless layout model so React views can reuse shared
// list behavior without duplicating width/scroll calculations.

import { ScrollState } from "./scroll_state";

export type GenericDisplayRow = {
  name: string;
  namePrefixSpans?: string[];
  displayShortcut?: string | null;
  matchIndices?: number[] | null;
  description?: string | null;
  categoryTag?: string | null;
  disabledReason?: string | null;
  isDisabled?: boolean;
  wrapIndent?: number | null;
};

export type ColumnWidthMode = "AutoVisible" | "AutoAllRows" | "Fixed";

export type VisibleRowsModel = {
  rows: GenericDisplayRow[];
  start: number;
  endExclusive: number;
  selectedInWindow: number | null;
};

export const MENU_SURFACE_INSET_VERTICAL = 1;
export const MENU_SURFACE_INSET_HORIZONTAL = 2;
export const MENU_SURFACE_HORIZONTAL_INSET = MENU_SURFACE_INSET_HORIZONTAL * 2;

function normalizeWidth(width: number): number {
  return Math.max(1, Math.floor(width));
}

function wordsWithNewline(value: string): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const logicalLine of value.split("\n")) {
    const parts = logicalLine.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      out.push("");
    } else {
      out.push(...parts);
    }
    out.push("\n");
  }
  if (out.length > 0) out.pop();
  return out;
}

function breakLongWord(word: string, width: number): string[] {
  if (word.length <= width) return [word];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < word.length) {
    chunks.push(word.slice(cursor, cursor + width));
    cursor += width;
  }
  return chunks;
}

export function wrapStyledLine(text: string, width: number): string[] {
  const maxWidth = normalizeWidth(width);
  const tokens = wordsWithNewline(text);
  if (tokens.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    lines.push(current);
    current = "";
  };

  for (const token of tokens) {
    if (token === "\n") {
      pushCurrent();
      continue;
    }

    const words = breakLongWord(token, maxWidth);
    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }

      const withSpace = `${current} ${word}`;
      if (withSpace.length <= maxWidth) {
        current = withSpace;
        continue;
      }
      pushCurrent();
      current = word;
    }
  }

  pushCurrent();
  return lines;
}

function rowDisplayText(row: GenericDisplayRow): string {
  const prefix = (row.namePrefixSpans ?? []).join("");
  const label = `${prefix}${row.name}`;

  const suffixes: string[] = [];
  if (row.categoryTag) suffixes.push(row.categoryTag);
  if (row.description) suffixes.push(row.description);
  if (row.disabledReason) suffixes.push(`(${row.disabledReason})`);

  if (suffixes.length === 0) {
    return label;
  }
  return `${label}  ${suffixes.join("  ")}`;
}

function rowHeight(row: GenericDisplayRow, width: number): number {
  return wrapStyledLine(rowDisplayText(row), width).length;
}

export function popupContentWidth(totalWidth: number): number {
  return Math.max(1, Math.floor(totalWidth) - MENU_SURFACE_HORIZONTAL_INSET);
}

export function menuSurfacePaddingHeight(): number {
  return MENU_SURFACE_INSET_VERTICAL * 2;
}

export function visibleRowsWindow(
  rows: GenericDisplayRow[],
  state: ScrollState,
  maxVisibleRows: number,
): VisibleRowsModel {
  const listLen = rows.length;
  const visible = Math.max(1, Math.floor(maxVisibleRows));
  state.clampSelection(listLen);
  state.ensureVisible(listLen, visible);

  const start = Math.min(state.scrollTop(), Math.max(0, listLen - visible));
  const endExclusive = Math.min(listLen, start + visible);

  const selected = state.selectedIndexOrNull();
  const selectedInWindow =
    selected === null || selected < start || selected >= endExclusive ? null : selected - start;

  return {
    rows: rows.slice(start, endExclusive),
    start,
    endExclusive,
    selectedInWindow,
  };
}

export function measureRowsHeight(
  rows: GenericDisplayRow[],
  state: ScrollState,
  maxVisibleRows: number,
  width: number,
): number {
  if (rows.length === 0) return 1;
  const visibleModel = visibleRowsWindow(rows, state, maxVisibleRows);
  return visibleModel.rows.reduce((sum, row) => sum + rowHeight(row, width), 0);
}

export type RenderRowModel = {
  row: GenericDisplayRow;
  lines: string[];
  selected: boolean;
  index: number;
};

export function renderRowsModel(
  rows: GenericDisplayRow[],
  state: ScrollState,
  maxVisibleRows: number,
  width: number,
  emptyMessage: string,
): RenderRowModel[] {
  if (rows.length === 0) {
    return [
      {
        row: { name: emptyMessage },
        lines: [emptyMessage],
        selected: false,
        index: 0,
      },
    ];
  }

  const visibleModel = visibleRowsWindow(rows, state, maxVisibleRows);
  const selected = visibleModel.selectedInWindow;

  return visibleModel.rows.map((row, offset) => ({
    row,
    lines: wrapStyledLine(rowDisplayText(row), width),
    selected: selected === offset,
    index: visibleModel.start + offset,
  }));
}
