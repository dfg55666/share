import type { ThreadSummary } from "../../api/contracts";

export type LoadedThreadsState = {
  byId: Record<string, ThreadSummary>;
  orderedIds: string[];
};

export function createLoadedThreadsState(threads: ThreadSummary[]): LoadedThreadsState {
  const byId: Record<string, ThreadSummary> = {};
  const orderedIds: string[] = [];
  for (const thread of threads) {
    byId[thread.id] = thread;
    orderedIds.push(thread.id);
  }
  return { byId, orderedIds };
}

export function updateLoadedThread(
  state: LoadedThreadsState,
  nextThread: ThreadSummary,
): LoadedThreadsState {
  const orderedIds = state.orderedIds.includes(nextThread.id)
    ? state.orderedIds
    : [...state.orderedIds, nextThread.id];
  return {
    byId: {
      ...state.byId,
      [nextThread.id]: nextThread,
    },
    orderedIds,
  };
}

export function listLoadedThreads(state: LoadedThreadsState): ThreadSummary[] {
  return state.orderedIds
    .map((id) => state.byId[id])
    .filter((thread): thread is ThreadSummary => Boolean(thread));
}
