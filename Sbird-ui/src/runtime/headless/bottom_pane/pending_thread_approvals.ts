// Web Phase 1 port (data-only) of `tuitoweb/src/bottom_pane/pending_thread_approvals.rs`.
//
// This tracks inactive threads that still have pending approval requests so the UI can surface
// them without switching away from the current thread.

import type { UiServerRequest } from "../../../api/contracts";

export type PendingThreadApproval = {
  threadId: string;
  count: number;
  latestReceivedAtIso?: string | null;
  requests: UiServerRequest[];
};

export class PendingThreadApprovals {
  private pending: PendingThreadApproval[] = [];

  setRequests(requests: UiServerRequest[]): void {
    const byThread = new Map<string, UiServerRequest[]>();
    for (const req of requests) {
      const list = byThread.get(req.threadId) ?? [];
      list.push(req);
      byThread.set(req.threadId, list);
    }

    this.pending = Array.from(byThread.entries())
      .map(([threadId, list]) => {
        const sorted = [...list].sort((a, b) => a.id - b.id);
        const latest = sorted[sorted.length - 1];
        return {
          threadId,
          count: sorted.length,
          latestReceivedAtIso: latest?.receivedAtIso ?? null,
          requests: sorted,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  list(): PendingThreadApproval[] {
    return this.pending;
  }
}
