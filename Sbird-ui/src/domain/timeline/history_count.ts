import type { UiTimelineItem } from "../../api/contracts";

const LOCAL_OPTIMISTIC_ID_PREFIX = "user-local-";
const STREAM_ONLY_ERROR_ID_PREFIX = "thread-error-";

function normalizedItemId(item: Pick<UiTimelineItem, "id">): string {
  return item.id.trim();
}

export function isCountableHistoryItem(
  item: Pick<UiTimelineItem, "id" | "completed">,
): boolean {
  const id = normalizedItemId(item);
  if (!id) {
    return false;
  }
  if (id.startsWith(LOCAL_OPTIMISTIC_ID_PREFIX)) {
    return false;
  }
  if (id.startsWith(STREAM_ONLY_ERROR_ID_PREFIX)) {
    return false;
  }
  // Count only durable history items. Upstream app-server does not persist streaming
  // deltas/begins, so in-progress placeholders must not advance the cached count.
  if (!item.completed) {
    return false;
  }
  return true;
}

export function countHistoryItems(items: UiTimelineItem[]): number {
  let count = 0;
  for (const item of items) {
    if (isCountableHistoryItem(item)) {
      count += 1;
    }
  }
  return count;
}
