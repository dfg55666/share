import type { UiServerRequest, UiTimelineEvent, UiTimelineSnapshot } from "../../api/contracts";

type RequestState = {
  byId: Map<number, UiServerRequest>;
  pendingRequestSetVersion: number;
};

function toSortedRequests(byId: Map<number, UiServerRequest>): UiServerRequest[] {
  return [...byId.values()].sort((left, right) => {
    const leftSeq = typeof left.displaySeq === "number" ? left.displaySeq : Number.MAX_SAFE_INTEGER;
    const rightSeq = typeof right.displaySeq === "number" ? right.displaySeq : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id - right.id;
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export class PendingAppServerRequests {
  private state: RequestState = {
    byId: new Map<number, UiServerRequest>(),
    pendingRequestSetVersion: 0,
  };

  replaceFromSnapshot(snapshot: UiTimelineSnapshot): void {
    const byId = new Map<number, UiServerRequest>();
    for (const request of snapshot.pendingRequests) {
      byId.set(request.id, request);
    }
    this.state = {
      byId,
      pendingRequestSetVersion: snapshot.pendingRequestSetVersion,
    };
  }

  applyEvent(event: UiTimelineEvent): void {
    if (event.eventType !== "server_request_added" && event.eventType !== "server_request_resolved") {
      return;
    }

    const payload = asRecord(event.payload);
    if (event.eventType === "server_request_added") {
      const requestRaw = payload?.request;
      if (requestRaw && typeof requestRaw === "object" && !Array.isArray(requestRaw)) {
        const req = requestRaw as UiServerRequest;
        this.state.byId.set(req.id, req);
        if (typeof req.pendingRequestSetVersion === "number") {
          this.state.pendingRequestSetVersion = req.pendingRequestSetVersion;
        }
      }
      return;
    }

    const requestId =
      typeof event.requestId === "number"
        ? event.requestId
        : typeof payload?.id === "number"
          ? payload.id
          : undefined;
    if (typeof requestId === "number") {
      this.state.byId.delete(requestId);
    }
    if (typeof payload?.pendingRequestSetVersion === "number") {
      this.state.pendingRequestSetVersion = payload.pendingRequestSetVersion;
    }
  }

  toArray(): UiServerRequest[] {
    return toSortedRequests(this.state.byId);
  }

  pendingRequestSetVersion(): number {
    return this.state.pendingRequestSetVersion;
  }
}
