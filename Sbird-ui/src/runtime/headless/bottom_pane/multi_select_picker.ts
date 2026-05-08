// Web port of `tuitoweb/src/bottom_pane/multi_select_picker.rs`.

import type { BottomPaneView, CancellationEvent } from "./bottom_pane_view";
import { MAX_POPUP_ROWS } from "./popup_consts";
import { ScrollState } from "./scroll_state";
import { type GenericDisplayRow, renderRowsModel } from "./selection_popup_common";

export type MultiSelectItem = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
};

export type MultiSelectPickerOptions = {
  subtitle?: string | null;
  orderingEnabled?: boolean;
};

function includesFuzzy(candidate: string, query: string): boolean {
  const c = candidate.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return true;

  let cursor = 0;
  for (let i = 0; i < c.length && cursor < q.length; i += 1) {
    if (c[i] === q[cursor]) cursor += 1;
  }
  return cursor === q.length;
}

export class MultiSelectPicker implements BottomPaneView {
  private readonly title: string;
  private readonly subtitle: string | null;
  private readonly orderingEnabled: boolean;
  private items: MultiSelectItem[] = [];
  private filteredIndices: number[] = [];
  private readonly state = new ScrollState();
  private searchQuery = "";
  private complete = false;
  private confirmedIds: string[] | null = null;

  constructor(title: string, items: MultiSelectItem[], options: MultiSelectPickerOptions = {}) {
    this.title = title;
    this.subtitle = options.subtitle ?? null;
    this.orderingEnabled = options.orderingEnabled ?? false;
    this.items = items.map((item) => ({ ...item }));
    this.applyFilter();
  }

  viewId(): string {
    return "MultiSelectPicker";
  }

  getTitle(): string {
    return this.title;
  }

  getSubtitle(): string | null {
    return this.subtitle;
  }

  setQuery(query: string): void {
    this.searchQuery = query.trim();
    this.applyFilter();
  }

  query(): string {
    return this.searchQuery;
  }

  listItems(): MultiSelectItem[] {
    return this.items;
  }

  filteredItems(): MultiSelectItem[] {
    return this.filteredIndices.map((idx) => this.items[idx]).filter(Boolean);
  }

  rows(width = 72): ReturnType<typeof renderRowsModel> {
    const rows: GenericDisplayRow[] = this.filteredIndices.map((idx, visibleIdx) => {
      const item = this.items[idx];
      const selected = this.state.selectedIndexOrNull() === visibleIdx ? "›" : " ";
      const marker = item?.enabled ? "x" : " ";
      return {
        name: `${selected} [${marker}] ${item?.name ?? ""}`,
        description: item?.description ?? null,
      };
    });
    return renderRowsModel(rows, this.state, MAX_POPUP_ROWS, width, "no matches");
  }

  moveUp(): void {
    const len = this.filteredIndices.length;
    this.state.moveUpWrap(len);
    this.state.ensureVisible(len, this.visibleRows(len));
  }

  moveDown(): void {
    const len = this.filteredIndices.length;
    this.state.moveDownWrap(len);
    this.state.ensureVisible(len, this.visibleRows(len));
  }

  toggle(id: string, enabled: boolean): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, enabled } : item));
    this.applyFilter();
  }

  toggleSelected(): void {
    const selected = this.selectedItem();
    if (!selected) return;
    this.toggle(selected.id, !selected.enabled);
  }

  selectedItem(): MultiSelectItem | null {
    const selected = this.state.selectedIndexOrNull();
    if (selected === null) return null;
    const actualIdx = this.filteredIndices[selected];
    if (typeof actualIdx !== "number") return null;
    return this.items[actualIdx] ?? null;
  }

  moveSelected(direction: "up" | "down"): void {
    if (!this.orderingEnabled || this.searchQuery) return;
    const selected = this.state.selectedIndexOrNull();
    if (selected === null) return;
    const actualIdx = this.filteredIndices[selected];
    if (typeof actualIdx !== "number") return;

    const target = direction === "up" ? actualIdx - 1 : actualIdx + 1;
    if (target < 0 || target >= this.items.length) return;

    const tmp = this.items[actualIdx];
    this.items[actualIdx] = this.items[target];
    this.items[target] = tmp;
    this.applyFilter();
  }

  confirmSelection(): string[] {
    this.complete = true;
    this.confirmedIds = this.items.filter((item) => item.enabled).map((item) => item.id);
    return this.confirmedIds;
  }

  cancel(): void {
    this.complete = true;
    this.confirmedIds = null;
  }

  confirmedSelection(): string[] | null {
    return this.confirmedIds ? [...this.confirmedIds] : null;
  }

  onCtrlC(): CancellationEvent {
    this.cancel();
    return "Handled";
  }

  isComplete(): boolean {
    return this.complete;
  }

  private applyFilter(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.filteredIndices = this.items.map((_, index) => index);
    } else {
      this.filteredIndices = this.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => includesFuzzy(item.name, query))
        .map(({ index }) => index);
    }

    const len = this.filteredIndices.length;
    this.state.clampSelection(len);
    this.state.ensureVisible(len, this.visibleRows(len));
  }

  private visibleRows(len: number): number {
    return Math.min(MAX_POPUP_ROWS, Math.max(1, len));
  }
}
