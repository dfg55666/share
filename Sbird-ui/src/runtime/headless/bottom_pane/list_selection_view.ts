// Web Phase 1 port of `tuitoweb/src/bottom_pane/list_selection_view.rs`.
//
// The Rust TUI implementation renders a searchable, scrollable selection popup with optional
// side content. Web Phase 1 keeps the same data shapes so other modules can construct selection
// views, but delegates actual UI rendering and key handling to React.

import type { BottomPaneView } from "./bottom_pane_view";

const MIN_LIST_WIDTH_FOR_SIDE = 40;
const SIDE_CONTENT_GAP = 2;
const MENU_SURFACE_HORIZONTAL_INSET = 4;

export type SideContentWidth = { kind: "Fixed"; width: number } | { kind: "Half" };

export type ColumnWidthMode = "AutoVisible" | "AutoAllRows" | "Fixed";

export function popupContentWidth(totalWidth: number): number {
  return Math.max(0, Math.floor(totalWidth) - MENU_SURFACE_HORIZONTAL_INSET);
}

export function sideBySideLayoutWidths(
  contentWidth: number,
  sideContentWidth: SideContentWidth,
  sideContentMinWidth: number,
): { listWidth: number; sideWidth: number } | null {
  const width = Math.max(0, Math.floor(contentWidth));
  const minSide = Math.max(0, Math.floor(sideContentMinWidth));
  const sideWidth =
    sideContentWidth.kind === "Fixed"
      ? sideContentWidth.width
      : Math.floor((width - SIDE_CONTENT_GAP) / 2);

  if (sideWidth <= 0 || sideWidth < minSide) return null;
  const listWidth = Math.max(0, width - SIDE_CONTENT_GAP - sideWidth);
  if (listWidth < MIN_LIST_WIDTH_FOR_SIDE) return null;
  return { listWidth, sideWidth };
}

export type SelectionAction = () => void;

export type SelectionItem = {
  name: string;
  description?: string | null;
  selectedDescription?: string | null;
  isCurrent?: boolean;
  isDefault?: boolean;
  isDisabled?: boolean;
  disabledReason?: string | null;
  dismissOnSelect?: boolean;
  actions?: SelectionAction[];
  searchValue?: string | null;
};

export type SelectionViewParams = {
  viewId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  footerHint?: string | null;
  items: SelectionItem[];
  isSearchable?: boolean;
  searchPlaceholder?: string | null;
  colWidthMode?: ColumnWidthMode;
  initialSelectedIdx?: number | null;
};

export class ListSelectionView implements BottomPaneView {
  private readonly params: SelectionViewParams;
  private selectedIdx: number;
  private complete = false;

  constructor(params: SelectionViewParams) {
    this.params = params;
    const initial =
      typeof params.initialSelectedIdx === "number" ? params.initialSelectedIdx : 0;
    this.selectedIdx = Math.max(0, Math.min(initial, params.items.length - 1));
  }

  viewId(): string | null {
    return this.params.viewId ?? null;
  }

  selectedIndex(): number | null {
    return this.params.items.length ? this.selectedIdx : null;
  }

  isComplete(): boolean {
    return this.complete;
  }

  selectIndex(idx: number): void {
    const clamped = Math.max(0, Math.min(Math.floor(idx), this.params.items.length - 1));
    this.selectedIdx = clamped;
  }

  acceptSelected(): void {
    const item = this.params.items[this.selectedIdx];
    if (!item || item.isDisabled) return;
    (item.actions ?? []).forEach((fn) => fn());
    if (item.dismissOnSelect ?? true) {
      this.complete = true;
    }
  }
}
