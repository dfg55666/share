// Web Phase 1 port of `tuitoweb/src/bottom_pane/approval_overlay.rs`.
//
// The Rust overlay is a rich TUI modal that handles multiple request kinds (exec, patch, perms).
// In the Sbird C-end API, approvals arrive as `pendingRequests` entries and are resolved through:
// `POST /api/threads/{threadId}/server-requests/respond`.
//
// This module keeps the queue/selection semantics (one request active, queue behind it) so the
// bottom-pane view stack can preserve 1:1 control flow even though rendering is handled by React.

import type { UiServerRequest } from "../../../api/contracts";
import type { BottomPaneView } from "./bottom_pane_view";

export type ApprovalRequest = UiServerRequest;
export type ApprovalDecision = "accept" | "reject";

export type ApprovalResolution = {
  request: ApprovalRequest;
  decision: ApprovalDecision;
};

export class ApprovalOverlay implements BottomPaneView {
  private currentRequest: ApprovalRequest | null;
  private readonly queue: ApprovalRequest[] = [];
  private done = false;

  constructor(request: ApprovalRequest) {
    this.currentRequest = request;
  }

  enqueueRequest(request: ApprovalRequest): void {
    this.queue.push(request);
  }

  current(): ApprovalRequest | null {
    return this.currentRequest;
  }

  queued(): ApprovalRequest[] {
    return this.queue;
  }

  viewId(): string | null {
    return "ApprovalOverlay";
  }

  isDone(): boolean {
    return this.done;
  }

  isComplete(): boolean {
    return this.done;
  }

  tryConsumeApprovalRequest(request: ApprovalRequest): ApprovalRequest | null {
    this.enqueueRequest(request);
    return null;
  }

  decide(decision: ApprovalDecision): ApprovalResolution | null {
    if (!this.currentRequest) return null;
    const resolution: ApprovalResolution = { request: this.currentRequest, decision };

    // Advance queue immediately (TUI marks current complete and then advances).
    this.currentRequest = this.queue.shift() ?? null;
    this.done = this.currentRequest === null;

    return resolution;
  }
}

export function formatRequestedPermissionsRule(rule: unknown): string {
  // Placeholder for parity with TUI's detailed permission formatting.
  try {
    return JSON.stringify(rule);
  } catch {
    return String(rule);
  }
}
