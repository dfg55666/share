import type { ThreadSummary } from "../../api/contracts";

export function findThreadIndex(threads: ThreadSummary[], threadId: string): number {
  return threads.findIndex((thread) => thread.id === threadId);
}

export function selectInitialThreadId(threads: ThreadSummary[]): string {
  if (threads.length === 0) return "";
  const running = threads.find((thread) => thread.inProgress);
  if (running) return running.id;
  return threads[0].id;
}

export function selectNextThreadId(
  threads: ThreadSummary[],
  currentThreadId: string,
): string {
  if (threads.length === 0) return "";
  const currentIndex = findThreadIndex(threads, currentThreadId);
  if (currentIndex < 0) return selectInitialThreadId(threads);
  const nextIndex = (currentIndex + 1) % threads.length;
  return threads[nextIndex]?.id ?? "";
}

export function selectPreviousThreadId(
  threads: ThreadSummary[],
  currentThreadId: string,
): string {
  if (threads.length === 0) return "";
  const currentIndex = findThreadIndex(threads, currentThreadId);
  if (currentIndex < 0) return selectInitialThreadId(threads);
  const nextIndex = (currentIndex - 1 + threads.length) % threads.length;
  return threads[nextIndex]?.id ?? "";
}
