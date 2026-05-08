// Port of `tuitoweb/src/streaming/commit_tick.rs` (commit tick orchestrator).

import type { HistoryCell } from "../chatwidget/history_cell";

import type { PlanStreamController, StreamController } from "./controller";
import { AdaptiveChunkingPolicy, type ChunkingDecision, type DrainPlan, type QueueSnapshot } from "./chunking";

export type CommitTickScope = "AnyMode" | "CatchUpOnly";

export type CommitTickOutput = {
  cells: Array<HistoryCell>;
  hasController: boolean;
  allIdle: boolean;
};

function defaultOutput(): CommitTickOutput {
  return { cells: [], hasController: false, allIdle: true };
}

export function runCommitTick(
  policy: AdaptiveChunkingPolicy,
  streamController: StreamController | null,
  planStreamController: PlanStreamController | null,
  scope: CommitTickScope,
  nowMs: number,
): CommitTickOutput {
  const snapshot = streamQueueSnapshot(streamController, planStreamController, nowMs);
  const decision = resolveChunkingPlan(policy, snapshot, nowMs);
  if (scope === "CatchUpOnly" && decision.mode !== "CatchUp") {
    return defaultOutput();
  }

  return applyCommitTickPlan(decision.drainPlan, streamController, planStreamController);
}

function streamQueueSnapshot(
  streamController: StreamController | null,
  planStreamController: PlanStreamController | null,
  nowMs: number,
): QueueSnapshot {
  let queuedLines = 0;
  let oldestAgeMs: number | null = null;

  if (streamController) {
    queuedLines += streamController.queuedLines();
    oldestAgeMs = maxDuration(oldestAgeMs, streamController.oldestQueuedAge(nowMs));
  }
  if (planStreamController) {
    queuedLines += planStreamController.queuedLines();
    oldestAgeMs = maxDuration(oldestAgeMs, planStreamController.oldestQueuedAge(nowMs));
  }

  return { queuedLines, oldestAgeMs };
}

function resolveChunkingPlan(
  policy: AdaptiveChunkingPolicy,
  snapshot: QueueSnapshot,
  nowMs: number,
): ChunkingDecision {
  const priorMode = policy.mode();
  const decision = policy.decide(snapshot, nowMs);
  if (decision.mode !== priorMode) {
    // Keep this as debug-only; it can be noisy in production.
    if (typeof console !== "undefined" && typeof console.debug === "function") {
      console.debug("stream chunking mode transition", {
        priorMode,
        newMode: decision.mode,
        queuedLines: snapshot.queuedLines,
        oldestQueuedAgeMs: snapshot.oldestAgeMs,
        enteredCatchUp: decision.enteredCatchUp,
      });
    }
  }
  return decision;
}

function applyCommitTickPlan(
  drainPlan: DrainPlan,
  streamController: StreamController | null,
  planStreamController: PlanStreamController | null,
): CommitTickOutput {
  const output = defaultOutput();

  if (streamController) {
    output.hasController = true;
    const [cell, isIdle] = drainStreamController(streamController, drainPlan);
    if (cell) output.cells.push(cell);
    output.allIdle = output.allIdle && isIdle;
  }

  if (planStreamController) {
    output.hasController = true;
    const [cell, isIdle] = drainPlanStreamController(planStreamController, drainPlan);
    if (cell) output.cells.push(cell);
    output.allIdle = output.allIdle && isIdle;
  }

  return output;
}

function drainStreamController(
  controller: StreamController,
  drainPlan: DrainPlan,
): [HistoryCell | null, boolean] {
  if (drainPlan.kind === "Single") {
    return controller.onCommitTick();
  }
  return controller.onCommitTickBatch(drainPlan.maxLines);
}

function drainPlanStreamController(
  controller: PlanStreamController,
  drainPlan: DrainPlan,
): [HistoryCell | null, boolean] {
  if (drainPlan.kind === "Single") {
    return controller.onCommitTick();
  }
  return controller.onCommitTickBatch(drainPlan.maxLines);
}

function maxDuration(lhs: number | null, rhs: number | null): number | null {
  if (typeof lhs === "number" && typeof rhs === "number") {
    return Math.max(lhs, rhs);
  }
  if (typeof lhs === "number") return lhs;
  if (typeof rhs === "number") return rhs;
  return null;
}
