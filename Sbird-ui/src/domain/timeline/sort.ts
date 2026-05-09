import type { UiTimelineItem } from "../../api/contracts";

/**
 * Sort timeline items by displaySeq (ascending), with id as tiebreaker.
 * Items without a numeric displaySeq are pushed to the end.
 */
export function sortTimelineItems(items: UiTimelineItem[]): UiTimelineItem[] {
  return [...items].sort((left, right) => {
    const leftSeq =
      typeof left.displaySeq === "number"
        ? left.displaySeq
        : Number.MAX_SAFE_INTEGER;
    const rightSeq =
      typeof right.displaySeq === "number"
        ? right.displaySeq
        : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id.localeCompare(right.id);
  });
}
