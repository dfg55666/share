// Port of `tuitoweb/src/streaming/chunking.rs` (adaptive commit-drain policy).

export const ENTER_QUEUE_DEPTH_LINES = 8;
export const ENTER_OLDEST_AGE_MS = 120;

export const EXIT_QUEUE_DEPTH_LINES = 2;
export const EXIT_OLDEST_AGE_MS = 40;

export const EXIT_HOLD_MS = 250;
export const REENTER_CATCH_UP_HOLD_MS = 250;

export const SEVERE_QUEUE_DEPTH_LINES = 64;
export const SEVERE_OLDEST_AGE_MS = 300;

export type ChunkingMode = "Smooth" | "CatchUp";

export type QueueSnapshot = {
  queuedLines: number;
  oldestAgeMs: number | null;
};

export type DrainPlan =
  | { kind: "Single" }
  | { kind: "Batch"; maxLines: number };

export type ChunkingDecision = {
  mode: ChunkingMode;
  enteredCatchUp: boolean;
  drainPlan: DrainPlan;
};

function shouldEnterCatchUp(snapshot: QueueSnapshot): boolean {
  if (snapshot.queuedLines >= ENTER_QUEUE_DEPTH_LINES) return true;
  if (typeof snapshot.oldestAgeMs === "number" && snapshot.oldestAgeMs >= ENTER_OLDEST_AGE_MS) {
    return true;
  }
  return false;
}

function shouldExitCatchUp(snapshot: QueueSnapshot): boolean {
  if (snapshot.queuedLines > EXIT_QUEUE_DEPTH_LINES) return false;
  if (typeof snapshot.oldestAgeMs === "number" && snapshot.oldestAgeMs > EXIT_OLDEST_AGE_MS) {
    return false;
  }
  return true;
}

function isSevereBacklog(snapshot: QueueSnapshot): boolean {
  if (snapshot.queuedLines >= SEVERE_QUEUE_DEPTH_LINES) return true;
  if (typeof snapshot.oldestAgeMs === "number" && snapshot.oldestAgeMs >= SEVERE_OLDEST_AGE_MS) {
    return true;
  }
  return false;
}

export class AdaptiveChunkingPolicy {
  private modeState: ChunkingMode = "Smooth";
  private belowExitThresholdSinceMs: number | null = null;
  private lastCatchUpExitAtMs: number | null = null;

  mode(): ChunkingMode {
    return this.modeState;
  }

  reset(): void {
    this.modeState = "Smooth";
    this.belowExitThresholdSinceMs = null;
    this.lastCatchUpExitAtMs = null;
  }

  decide(snapshot: QueueSnapshot, nowMs: number): ChunkingDecision {
    if (snapshot.queuedLines === 0) {
      this.noteCatchUpExit(nowMs);
      this.modeState = "Smooth";
      this.belowExitThresholdSinceMs = null;
      return {
        mode: this.modeState,
        enteredCatchUp: false,
        drainPlan: { kind: "Single" },
      };
    }

    const enteredCatchUp =
      this.modeState === "Smooth" ? this.maybeEnterCatchUp(snapshot, nowMs) : false;

    if (this.modeState === "CatchUp") {
      this.maybeExitCatchUp(snapshot, nowMs);
    }

    const drainPlan: DrainPlan =
      this.modeState === "Smooth"
        ? { kind: "Single" }
        : { kind: "Batch", maxLines: Math.max(1, snapshot.queuedLines) };

    return {
      mode: this.modeState,
      enteredCatchUp,
      drainPlan,
    };
  }

  private maybeEnterCatchUp(snapshot: QueueSnapshot, nowMs: number): boolean {
    if (!shouldEnterCatchUp(snapshot)) return false;
    if (this.reentryHoldActive(nowMs) && !isSevereBacklog(snapshot)) return false;

    this.modeState = "CatchUp";
    this.belowExitThresholdSinceMs = null;
    this.lastCatchUpExitAtMs = null;
    return true;
  }

  private maybeExitCatchUp(snapshot: QueueSnapshot, nowMs: number): void {
    if (!shouldExitCatchUp(snapshot)) {
      this.belowExitThresholdSinceMs = null;
      return;
    }

    if (typeof this.belowExitThresholdSinceMs === "number") {
      if (nowMs - this.belowExitThresholdSinceMs >= EXIT_HOLD_MS) {
        this.modeState = "Smooth";
        this.belowExitThresholdSinceMs = null;
        this.lastCatchUpExitAtMs = nowMs;
      }
      return;
    }

    this.belowExitThresholdSinceMs = nowMs;
  }

  private noteCatchUpExit(nowMs: number): void {
    if (this.modeState === "CatchUp") {
      this.lastCatchUpExitAtMs = nowMs;
    }
  }

  private reentryHoldActive(nowMs: number): boolean {
    if (typeof this.lastCatchUpExitAtMs !== "number") return false;
    return nowMs - this.lastCatchUpExitAtMs < REENTER_CATCH_UP_HOLD_MS;
  }
}
