// Web Phase 1 simplified port of `tuitoweb/src/bottom_pane/paste_burst.rs`.
//
// The browser already surfaces pastes as a single event, so this is mostly used to preserve
// the same composer API surface for parity and unit testing.

export type FlushResult =
  | { kind: "Paste"; text: string }
  | { kind: "Typed"; ch: string }
  | { kind: "None" };

export class PasteBurst {
  private buffer = "";
  private lastAppendAtMs: number | null = null;
  private active = false;

  static recommendedFlushDelayMs(): number {
    return 16;
  }

  append(text: string, nowMs: number): void {
    if (!text) return;
    this.active = true;
    this.buffer += text;
    this.lastAppendAtMs = nowMs;
  }

  isInPasteBurst(): boolean {
    return this.active && this.buffer.length > 0;
  }

  flushIfDue(nowMs: number): FlushResult {
    if (!this.isInPasteBurst()) return { kind: "None" };
    if (typeof this.lastAppendAtMs === "number" && nowMs - this.lastAppendAtMs < 30) {
      return { kind: "None" };
    }
    const out = this.buffer;
    this.buffer = "";
    this.lastAppendAtMs = null;
    this.active = false;
    return { kind: "Paste", text: out };
  }

  clear(): void {
    this.buffer = "";
    this.lastAppendAtMs = null;
    this.active = false;
  }
}
