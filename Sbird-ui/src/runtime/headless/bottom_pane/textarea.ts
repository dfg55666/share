// Web Phase 1 port of `tuitoweb/src/bottom_pane/textarea.rs`.
//
// The Rust TUI textarea handles cursor movement, wrapping cache, and placeholder "elements".
// In the browser, text editing is handled by the DOM. We still keep a minimal, pure state model
// so composer logic can be unit-tested and shared across views.

export type TextAreaState = {
  scroll: number;
};

export class TextArea {
  private text = "";
  private cursorPos = 0;
  private killBuffer = "";

  setTextClearingElements(text: string): void {
    this.text = text ?? "";
    this.cursorPos = Math.min(this.cursorPos, this.text.length);
  }

  textContent(): string {
    return this.text;
  }

  isEmpty(): boolean {
    return this.text.length === 0;
  }

  cursor(): number {
    return this.cursorPos;
  }

  setCursor(pos: number): void {
    const clamped = Math.max(0, Math.min(Math.floor(pos), this.text.length));
    this.cursorPos = clamped;
  }

  insertStr(text: string): void {
    this.insertStrAt(this.cursorPos, text);
  }

  insertStrAt(pos: number, text: string): void {
    const safePos = Math.max(0, Math.min(Math.floor(pos), this.text.length));
    const before = this.text.slice(0, safePos);
    const after = this.text.slice(safePos);
    this.text = `${before}${text}${after}`;
    if (safePos <= this.cursorPos) {
      this.cursorPos += text.length;
    }
  }

  replaceRange(range: { start: number; end: number }, text: string): void {
    const start = Math.max(0, Math.min(Math.floor(range.start), this.text.length));
    const end = Math.max(start, Math.min(Math.floor(range.end), this.text.length));
    this.text = `${this.text.slice(0, start)}${text}${this.text.slice(end)}`;
    this.cursorPos = Math.min(this.text.length, start + text.length);
  }

  // Minimal Ctrl+K: kill from cursor to end-of-line (here: end of buffer).
  killToEnd(): void {
    this.killBuffer = this.text.slice(this.cursorPos);
    this.text = this.text.slice(0, this.cursorPos);
  }

  // Minimal Ctrl+Y: yank last killed text at cursor.
  yank(): void {
    if (!this.killBuffer) return;
    this.insertStr(this.killBuffer);
  }
}
