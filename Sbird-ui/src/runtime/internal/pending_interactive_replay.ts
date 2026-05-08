import type { UiTimelineEvent } from "../../api/contracts";

export type PendingInteractiveReplayState = {
  token: number;
  buffer: UiTimelineEvent[];
};

export function createPendingInteractiveReplayState(
  token: number,
): PendingInteractiveReplayState {
  return { token, buffer: [] };
}

export function appendPendingInteractiveReplayEvent(
  state: PendingInteractiveReplayState,
  event: UiTimelineEvent,
): PendingInteractiveReplayState {
  return {
    ...state,
    buffer: [...state.buffer, event],
  };
}

export function flushPendingInteractiveReplayEvents(
  state: PendingInteractiveReplayState,
  afterIndex: number,
): UiTimelineEvent[] {
  // We no longer depend on server-provided cursors; replay order is just arrival order.
  const normalized =
    typeof afterIndex === "number" && Number.isFinite(afterIndex)
      ? Math.max(0, Math.trunc(afterIndex))
      : 0;
  return state.buffer.slice(normalized);
}
