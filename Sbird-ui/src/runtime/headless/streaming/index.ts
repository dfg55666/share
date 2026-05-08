// Port of `tuitoweb/src/streaming/mod.rs`.
//
// The key invariant is queue ordering: drains always pop from the front, and enqueue
// records a timestamp so chunking policy can reason about queue pressure.

import { MarkdownStreamCollector } from "../render/common/markdown_stream";
import type { RtLine } from "../render/line_utils";

type QueuedLine = {
  line: RtLine;
  enqueuedAtMs: number;
};

function monotonicNowMs(): number {
  // `performance.now()` is monotonic in browsers; fall back for non-DOM contexts.
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export class StreamState {
  public readonly collector: MarkdownStreamCollector;
  private queuedLines: QueuedLine[] = [];
  public hasSeenDelta = false;

  constructor(width: number | null, cwd: string) {
    this.collector = new MarkdownStreamCollector(width, cwd);
  }

  clear(): void {
    this.collector.clear();
    this.queuedLines = [];
    this.hasSeenDelta = false;
  }

  step(): RtLine[] {
    const first = this.queuedLines.shift();
    return first ? [first.line] : [];
  }

  drainN(maxLines: number): RtLine[] {
    const end = Math.min(Math.max(0, Math.floor(maxLines)), this.queuedLines.length);
    const drained = this.queuedLines.splice(0, end);
    return drained.map((entry) => entry.line);
  }

  drainAll(): RtLine[] {
    const drained = this.queuedLines;
    this.queuedLines = [];
    return drained.map((entry) => entry.line);
  }

  isIdle(): boolean {
    return this.queuedLines.length === 0;
  }

  queuedLen(): number {
    return this.queuedLines.length;
  }

  oldestQueuedAge(nowMs: number): number | null {
    const first = this.queuedLines[0];
    if (!first) return null;
    return Math.max(0, nowMs - first.enqueuedAtMs);
  }

  enqueue(lines: RtLine[]): void {
    const nowMs = monotonicNowMs();
    for (const line of lines) {
      this.queuedLines.push({ line, enqueuedAtMs: nowMs });
    }
  }
}

export { monotonicNowMs };
export * from "./chunking";
export * from "./commit_tick";
export * from "./controller";
