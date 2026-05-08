// Web port of `tuitoweb/src/bottom_pane/file_search_popup.rs`.

import type { BottomPaneView } from "./bottom_pane_view";
import { MAX_POPUP_ROWS } from "./popup_consts";
import { ScrollState } from "./scroll_state";
import { type GenericDisplayRow, renderRowsModel } from "./selection_popup_common";

export type FileMatch = {
  path: string;
  preview?: string | null;
  indices?: number[] | null;
  score?: number;
};

export class FileSearchPopup implements BottomPaneView {
  private displayQuery = "";
  private pendingQuery = "";
  private waiting = true;
  private matches: FileMatch[] = [];
  private readonly state = new ScrollState();
  private complete = false;

  setQuery(query: string): void {
    if (query === this.pendingQuery) return;
    this.pendingQuery = query;
    this.waiting = true;
  }

  setEmptyPrompt(): void {
    this.displayQuery = "";
    this.pendingQuery = "";
    this.waiting = false;
    this.matches = [];
    this.state.reset();
  }

  getQuery(): string {
    return this.pendingQuery;
  }

  setMatches(queryOrMatches: string | FileMatch[], maybeMatches?: FileMatch[]): void {
    const query = Array.isArray(queryOrMatches) ? this.pendingQuery : queryOrMatches;
    const incoming = Array.isArray(queryOrMatches) ? queryOrMatches : (maybeMatches ?? []);
    if (query !== this.pendingQuery) return;

    this.displayQuery = query;
    this.matches = incoming.slice(0, MAX_POPUP_ROWS);
    this.waiting = false;
    this.state.clampSelection(this.matches.length);
    this.state.ensureVisible(this.matches.length, this.maxVisibleRows());
  }

  getMatches(): FileMatch[] {
    return this.matches;
  }

  moveUp(): void {
    const len = this.matches.length;
    this.state.moveUpWrap(len);
    this.state.ensureVisible(len, this.maxVisibleRows());
  }

  moveDown(): void {
    const len = this.matches.length;
    this.state.moveDownWrap(len);
    this.state.ensureVisible(len, this.maxVisibleRows());
  }

  selectedMatch(): FileMatch | null {
    const selected = this.state.selectedIndexOrNull();
    if (selected === null) return null;
    return this.matches[selected] ?? null;
  }

  selectedMatchPath(): string | null {
    return this.selectedMatch()?.path ?? null;
  }

  calculateRequiredHeight(): number {
    return Math.max(1, Math.min(MAX_POPUP_ROWS, this.matches.length || 1));
  }

  emptyMessage(): string {
    if (this.waiting) return "loading...";
    if (!this.displayQuery) return "Type to search files";
    return "no matches";
  }

  rows(width = 72): ReturnType<typeof renderRowsModel> {
    const rows: GenericDisplayRow[] = this.matches.map((match) => ({
      name: match.path,
      description: match.preview ?? null,
      matchIndices: match.indices ?? null,
    }));
    return renderRowsModel(rows, this.state, MAX_POPUP_ROWS, width, this.emptyMessage());
  }

  status(): { displayQuery: string; pendingQuery: string; waiting: boolean } {
    return {
      displayQuery: this.displayQuery,
      pendingQuery: this.pendingQuery,
      waiting: this.waiting,
    };
  }

  close(): void {
    this.complete = true;
  }

  isComplete(): boolean {
    return this.complete;
  }

  private maxVisibleRows(): number {
    return Math.min(MAX_POPUP_ROWS, Math.max(1, this.matches.length));
  }
}
