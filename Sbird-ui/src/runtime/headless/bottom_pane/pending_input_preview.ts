// Web Phase 1 port (data-only) of `tuitoweb/src/bottom_pane/pending_input_preview.rs`.

import type { PendingInputEntry } from "../../../domain/input";

export class PendingInputPreview {
  private entries: PendingInputEntry[] = [];

  set(entries: PendingInputEntry[]): void {
    this.entries = [...entries];
  }

  clear(): void {
    this.entries = [];
  }

  list(): PendingInputEntry[] {
    return this.entries;
  }
}
