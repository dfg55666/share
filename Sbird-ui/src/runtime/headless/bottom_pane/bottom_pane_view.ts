// Port of `tuitoweb/src/bottom_pane/bottom_pane_view.rs`.
//
// In the Rust TUI this is a trait implemented by every modal/popup that can be
// displayed in the bottom pane. Web Phase 1 keeps the same view-stack model as a
// headless interface; the React layer decides how to render concrete view models.

import type { ApprovalRequest } from "./approval_overlay";

export type CancellationEvent = "Handled" | "NotHandled";

export type RequestUserInputEvent = {
  id?: string | number;
  prompt?: string;
  payload?: unknown;
};

export type McpServerElicitationFormRequest = {
  serverName: string;
  requestId: string;
  message?: string;
  payload?: unknown;
};

export interface BottomPaneView {
  // Handle a key event while the view is active.
  handleKeyEvent?(event: KeyboardEvent): void;

  // Return true if the view has finished and should be removed.
  isComplete?(): boolean;

  // Stable identifier for views that need external refreshes while open.
  viewId?(): string | null;

  // List-based views can preserve selection across refreshes.
  selectedIndex?(): number | null;

  // Handle Ctrl+C / cancellation.
  onCtrlC?(): CancellationEvent;

  // Whether Esc should be routed through handleKeyEvent.
  preferEscToHandleKeyEvent?(): boolean;

  // Optional paste handler.
  handlePaste?(pasted: string): boolean;

  // Paste burst flushing hooks kept for parity.
  flushPasteBurstIfDue?(): boolean;
  isInPasteBurst?(): boolean;

  // Try to consume an approval request.
  tryConsumeApprovalRequest?(request: ApprovalRequest): ApprovalRequest | null;

  // Try to consume a request-user-input prompt.
  tryConsumeUserInputRequest?(request: RequestUserInputEvent): RequestUserInputEvent | null;

  // Try to consume an MCP elicitation request.
  tryConsumeMcpServerElicitationRequest?(
    request: McpServerElicitationFormRequest,
  ): McpServerElicitationFormRequest | null;
}
