// Port of `tuitoweb/src/bottom_pane/mod.rs`.
//
// The Rust TUI BottomPane is the owning container for:
// - the ChatComposer (draft input)
// - a stack of transient BottomPaneView popups/modals
//
// Web Phase 1 keeps the same ownership boundaries and routing semantics, but does not attempt
// to emulate terminal drawing. React renders derived view models.

export const modulePath = "bottom_pane";

export { ChatComposer, defaultChatComposerConfig, type ChatComposerConfig, type InputResult } from "./chat_composer";
export { ApprovalOverlay, formatRequestedPermissionsRule, type ApprovalDecision, type ApprovalRequest, type ApprovalResolution } from "./approval_overlay";
export { PendingInputPreview } from "./pending_input_preview";
export { PendingThreadApprovals, type PendingThreadApproval } from "./pending_thread_approvals";
export { UnifiedExecFooter, type UnifiedExecSummary } from "./unified_exec_footer";
export type { BottomPaneView, CancellationEvent, McpServerElicitationFormRequest, RequestUserInputEvent } from "./bottom_pane_view";

import { ChatComposer } from "./chat_composer";
import { ApprovalOverlay, type ApprovalRequest } from "./approval_overlay";
import type { BottomPaneView } from "./bottom_pane_view";
import { PendingInputPreview } from "./pending_input_preview";
import { PendingThreadApprovals } from "./pending_thread_approvals";
import { UnifiedExecFooter } from "./unified_exec_footer";

export type BottomPaneParams = {
  placeholderText: string;
  disablePasteBurst?: boolean;
  animationsEnabled?: boolean;
};

export class BottomPane {
  private readonly composer: ChatComposer;
  private readonly viewStack: Array<BottomPaneView> = [];

  private readonly disablePasteBurst: boolean;
  private readonly animationsEnabled: boolean;

  private isTaskRunning = false;
  private readonly unifiedExecFooter = new UnifiedExecFooter();
  private readonly pendingInputPreview = new PendingInputPreview();
  private readonly pendingThreadApprovals = new PendingThreadApprovals();

  constructor(params: BottomPaneParams) {
    this.composer = new ChatComposer(params.placeholderText);
    this.disablePasteBurst = Boolean(params.disablePasteBurst);
    this.animationsEnabled = params.animationsEnabled ?? true;
  }

  chatComposer(): ChatComposer {
    return this.composer;
  }

  activeView(): BottomPaneView | null {
    const top = this.viewStack[this.viewStack.length - 1];
    return top ?? null;
  }

  viewCount(): number {
    return this.viewStack.length;
  }

  pushView(view: BottomPaneView): void {
    this.viewStack.push(view);
  }

  popView(): BottomPaneView | null {
    const popped = this.viewStack.pop();
    return popped ?? null;
  }

  setTaskRunning(isRunning: boolean): void {
    this.isTaskRunning = isRunning;
  }

  taskRunning(): boolean {
    return this.isTaskRunning;
  }

  unifiedExec(): UnifiedExecFooter {
    return this.unifiedExecFooter;
  }

  inputPreview(): PendingInputPreview {
    return this.pendingInputPreview;
  }

  threadApprovals(): PendingThreadApprovals {
    return this.pendingThreadApprovals;
  }

  // --- Interrupt-like request routing (approvals / user input prompts / elicitation) ---

  tryConsumeApprovalRequest(request: ApprovalRequest): ApprovalRequest | null {
    // Let the top-most view consume first (TUI behavior).
    const active = this.activeView();
    const remainingFromActive = active?.tryConsumeApprovalRequest?.(request) ?? request;
    if (!remainingFromActive) {
      return null;
    }

    // Otherwise, open an approval overlay and consume it.
    const overlay = new ApprovalOverlay(remainingFromActive);
    this.pushView(overlay);
    return null;
  }

  currentApprovalOverlay(): ApprovalOverlay | null {
    const active = this.activeView();
    return active instanceof ApprovalOverlay ? active : null;
  }

  private rebuildApprovalOverlay(sorted: ApprovalRequest[]): void {
    const overlay = this.currentApprovalOverlay();
    if (overlay) {
      this.popView();
    }
    const first = sorted.shift();
    if (!first) {
      return;
    }
    const next = new ApprovalOverlay(first);
    for (const req of sorted) {
      next.enqueueRequest(req);
    }
    this.pushView(next);
  }

  applyPendingApprovals(pendingRequests: ApprovalRequest[]): void {
    const sorted = [...pendingRequests].sort((a, b) => a.id - b.id);
    this.pendingThreadApprovals.setRequests(sorted);
    this.rebuildApprovalOverlay(sorted);
  }

  // --- Input/paste routing ---

  handlePaste(pasted: string): boolean {
    if (!pasted) return false;
    const active = this.activeView();
    if (active?.handlePaste?.(pasted)) {
      return true;
    }
    if (this.disablePasteBurst) {
      this.composer.setTextContent(`${this.composer.getText()}${pasted}`);
      return true;
    }
    this.composer.setTextContent(`${this.composer.getText()}${pasted}`);
    return true;
  }

  isAnimationsEnabled(): boolean {
    return this.animationsEnabled;
  }
}
