import type { UiTimelineItem } from "../api/contracts";

export const DEFAULT_TIMELINE_WINDOW_LIMIT = 200;
export const TIMELINE_WINDOW_PAGE_SIZE = 200;
export const MAX_TIMELINE_WINDOW_LIMIT = 2000;

function sortTimelineItems(items: UiTimelineItem[]): UiTimelineItem[] {
  return [...items].sort((left, right) => {
    const leftSeq = typeof left.displaySeq === "number" ? left.displaySeq : Number.MAX_SAFE_INTEGER;
    const rightSeq = typeof right.displaySeq === "number" ? right.displaySeq : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id.localeCompare(right.id);
  });
}

function shouldKeepOutOfWindow(item: UiTimelineItem): boolean {
  // Keep in-progress items so they can continue receiving deltas.
  if (!item.completed) return true;
  // Keep local optimistic user messages until baseline reconciliation.
  if (item.id.startsWith("user-local-")) return true;
  return false;
}

export function windowTimelineItems(items: UiTimelineItem[], limit: number): UiTimelineItem[] {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (normalizedLimit <= 0) {
    return sortTimelineItems(items.filter(shouldKeepOutOfWindow));
  }

  const sorted = sortTimelineItems(items);
  const tail = sorted.slice(Math.max(0, sorted.length - normalizedLimit));
  const keepById = new Map<string, UiTimelineItem>();
  for (const item of tail) {
    keepById.set(item.id, item);
  }
  for (const item of sorted) {
    if (shouldKeepOutOfWindow(item)) {
      keepById.set(item.id, item);
    }
  }
  return sortTimelineItems([...keepById.values()]);
}

