// Port of `tuitoweb/src/streaming/controller.rs`.

import type { HistoryCell } from "../chatwidget/history_cell";
import { AgentMessageCell, PlanHistoryCell } from "../chatwidget/history_cell";
import { prefixLines, type RtLine, type RtSpan } from "../render/line_utils";

import { StreamState, monotonicNowMs } from "./index";

export class StreamController {
  private readonly state: StreamState;
  private finishingAfterDrain = false;
  private headerEmitted = false;

  constructor(width: number | null, cwd: string) {
    this.state = new StreamState(width, cwd);
  }

  static new(width: number | null, cwd: string): StreamController {
    return new StreamController(width, cwd);
  }

  push(delta: string): boolean {
    const state = this.state;
    if (delta.length > 0) {
      state.hasSeenDelta = true;
    }

    state.collector.pushDelta(delta);
    if (delta.includes("\n")) {
      const newlyCompleted = state.collector.commitCompleteLines();
      if (newlyCompleted.length > 0) {
        state.enqueue(newlyCompleted);
        return true;
      }
    }

    return false;
  }

  finalize(): HistoryCell | null {
    const remaining = this.state.collector.finalizeAndDrain();

    const outLines: RtLine[] = [];
    if (remaining.length > 0) {
      this.state.enqueue(remaining);
    }
    const step = this.state.drainAll();
    outLines.push(...step);

    this.state.clear();
    this.finishingAfterDrain = false;
    return this.emit(outLines);
  }

  onCommitTick(): [HistoryCell | null, boolean] {
    const step = this.state.step();
    return [this.emit(step), this.state.isIdle()];
  }

  onCommitTickBatch(maxLines: number): [HistoryCell | null, boolean] {
    const step = this.state.drainN(Math.max(1, maxLines));
    return [this.emit(step), this.state.isIdle()];
  }

  queuedLines(): number {
    return this.state.queuedLen();
  }

  oldestQueuedAge(nowMs: number): number | null {
    return this.state.oldestQueuedAge(nowMs);
  }

  private emit(lines: RtLine[]): HistoryCell | null {
    if (lines.length === 0) return null;
    const includeHeader = !this.headerEmitted;
    this.headerEmitted = true;
    return new AgentMessageCell(lines, includeHeader);
  }
}

export class PlanStreamController {
  private readonly state: StreamState;
  private headerEmitted = false;
  private topPaddingEmitted = false;

  constructor(width: number | null, cwd: string) {
    this.state = new StreamState(width, cwd);
  }

  static new(width: number | null, cwd: string): PlanStreamController {
    return new PlanStreamController(width, cwd);
  }

  push(delta: string): boolean {
    const state = this.state;
    if (delta.length > 0) {
      state.hasSeenDelta = true;
    }
    state.collector.pushDelta(delta);
    if (delta.includes("\n")) {
      const newlyCompleted = state.collector.commitCompleteLines();
      if (newlyCompleted.length > 0) {
        state.enqueue(newlyCompleted);
        return true;
      }
    }
    return false;
  }

  finalize(): HistoryCell | null {
    const remaining = this.state.collector.finalizeAndDrain();
    const outLines: RtLine[] = [];
    if (remaining.length > 0) {
      this.state.enqueue(remaining);
    }
    outLines.push(...this.state.drainAll());

    this.state.clear();
    return this.emit(outLines, /* includeBottomPadding */ true);
  }

  onCommitTick(): [HistoryCell | null, boolean] {
    const step = this.state.step();
    return [this.emit(step, /* includeBottomPadding */ false), this.state.isIdle()];
  }

  onCommitTickBatch(maxLines: number): [HistoryCell | null, boolean] {
    const step = this.state.drainN(Math.max(1, maxLines));
    return [this.emit(step, /* includeBottomPadding */ false), this.state.isIdle()];
  }

  queuedLines(): number {
    return this.state.queuedLen();
  }

  oldestQueuedAge(nowMs: number): number | null {
    return this.state.oldestQueuedAge(nowMs);
  }

  private emit(lines: RtLine[], includeBottomPadding: boolean): HistoryCell | null {
    if (lines.length === 0 && !includeBottomPadding) {
      return null;
    }

    const outLines: RtLine[] = [];
    const isContinuation = this.headerEmitted;

    if (!this.headerEmitted) {
      outLines.push({ spans: [{ content: "• Proposed Plan" }] });
      outLines.push({ spans: [{ content: " " }] });
      this.headerEmitted = true;
      this.topPaddingEmitted = true;
    } else if (!this.topPaddingEmitted) {
      outLines.push({ spans: [{ content: " " }] });
      this.topPaddingEmitted = true;
    }

    const planPrefix: RtSpan = { content: isContinuation ? "  " : "  " };
    const rendered = prefixLines(lines, planPrefix, planPrefix);
    outLines.push(...rendered);

    if (includeBottomPadding) {
      outLines.push({ spans: [{ content: " " }] });
    }

    return new PlanHistoryCell(outLines, isContinuation);
  }
}

export function defaultCommitTickNowMs(): number {
  return monotonicNowMs();
}
