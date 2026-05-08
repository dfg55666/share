// Port of `tuitoweb/src/bottom_pane/scroll_state.rs`.
//
// Shared list navigation state:
// - optional selection
// - wrap-around move up/down
// - viewport anchoring via `scrollTop`

export class ScrollState {
  private selectedIdx: number | null = null;
  private scrollTopValue = 0;

  reset(): void {
    this.selectedIdx = null;
    this.scrollTopValue = 0;
  }

  selectedIndex(): number {
    return this.selectedIdx ?? 0;
  }

  selectedIndexOrNull(): number | null {
    return this.selectedIdx;
  }

  scrollTop(): number {
    return this.scrollTopValue;
  }

  setSelectedIndex(index: number | null): void {
    if (typeof index !== "number" || !Number.isFinite(index)) {
      this.selectedIdx = null;
      return;
    }
    this.selectedIdx = Math.max(0, Math.floor(index));
  }

  clampSelection(len: number): void {
    if (len <= 0) {
      this.selectedIdx = null;
      this.scrollTopValue = 0;
      return;
    }

    const current = this.selectedIdx ?? 0;
    this.selectedIdx = Math.min(current, len - 1);
  }

  moveUpWrap(len: number): void {
    if (len <= 0) {
      this.selectedIdx = null;
      this.scrollTopValue = 0;
      return;
    }

    const current = this.selectedIdx;
    if (current === null) {
      this.selectedIdx = 0;
      return;
    }
    this.selectedIdx = current > 0 ? current - 1 : len - 1;
  }

  moveDownWrap(len: number): void {
    if (len <= 0) {
      this.selectedIdx = null;
      this.scrollTopValue = 0;
      return;
    }

    const current = this.selectedIdx;
    if (current === null) {
      this.selectedIdx = 0;
      return;
    }
    this.selectedIdx = current + 1 < len ? current + 1 : 0;
  }

  ensureVisible(len: number, visibleRows: number): void {
    if (len <= 0 || visibleRows <= 0) {
      this.scrollTopValue = 0;
      return;
    }

    const selected = this.selectedIdx;
    if (selected === null) {
      this.scrollTopValue = 0;
      return;
    }

    if (selected < this.scrollTopValue) {
      this.scrollTopValue = selected;
      return;
    }

    const bottom = this.scrollTopValue + visibleRows - 1;
    if (selected > bottom) {
      this.scrollTopValue = selected + 1 - visibleRows;
    }
  }
}
