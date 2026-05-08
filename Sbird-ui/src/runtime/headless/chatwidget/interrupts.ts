// Port of `tuitoweb/src/chatwidget/interrupts.rs`.
//
// The Rust TUI queues "interrupt-like" events (approvals, user input prompts, exec begin/end,
// MCP tool begin/end, etc.) so they can be flushed into the UI in a controlled order.
//
// In the Web Phase 1 runtime, the authoritative source of approvals is the timeline snapshot
// (`pendingRequests`) plus item updates, but we keep the same queue abstraction so the
// ChatWidget can preserve ordering and avoid re-entrancy when UI overlays are active.

export type QueuedInterrupt =
  | { kind: "server_request"; payload: unknown }
  | { kind: "exec_begin"; payload: unknown }
  | { kind: "exec_end"; payload: unknown }
  | { kind: "mcp_begin"; payload: unknown }
  | { kind: "mcp_end"; payload: unknown }
  | { kind: "patch_end"; payload: unknown }
  | { kind: "request_permissions"; payload: unknown }
  | { kind: "request_user_input"; payload: unknown }
  | { kind: "elicitation"; payload: unknown }
  | { kind: "exec_approval"; payload: unknown }
  | { kind: "apply_patch_approval"; payload: unknown };

export type InterruptConsumer = {
  handleServerRequestNow?: (payload: unknown) => void;
  handleExecBeginNow?: (payload: unknown) => void;
  handleExecEndNow?: (payload: unknown) => void;
  handleMcpBeginNow?: (payload: unknown) => void;
  handleMcpEndNow?: (payload: unknown) => void;
  handlePatchApplyEndNow?: (payload: unknown) => void;
  handleRequestPermissionsNow?: (payload: unknown) => void;
  handleRequestUserInputNow?: (payload: unknown) => void;
  handleElicitationRequestNow?: (payload: unknown) => void;
  handleExecApprovalNow?: (payload: unknown) => void;
  handleApplyPatchApprovalNow?: (payload: unknown) => void;
};

export class InterruptManager {
  private readonly queue: QueuedInterrupt[] = [];

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  pushServerRequest(payload: unknown): void {
    this.queue.push({ kind: "server_request", payload });
  }

  pushExecApproval(payload: unknown): void {
    this.queue.push({ kind: "exec_approval", payload });
  }

  pushApplyPatchApproval(payload: unknown): void {
    this.queue.push({ kind: "apply_patch_approval", payload });
  }

  pushElicitation(payload: unknown): void {
    this.queue.push({ kind: "elicitation", payload });
  }

  pushRequestPermissions(payload: unknown): void {
    this.queue.push({ kind: "request_permissions", payload });
  }

  pushRequestUserInput(payload: unknown): void {
    this.queue.push({ kind: "request_user_input", payload });
  }

  pushExecBegin(payload: unknown): void {
    this.queue.push({ kind: "exec_begin", payload });
  }

  pushExecEnd(payload: unknown): void {
    this.queue.push({ kind: "exec_end", payload });
  }

  pushMcpBegin(payload: unknown): void {
    this.queue.push({ kind: "mcp_begin", payload });
  }

  pushMcpEnd(payload: unknown): void {
    this.queue.push({ kind: "mcp_end", payload });
  }

  pushPatchEnd(payload: unknown): void {
    this.queue.push({ kind: "patch_end", payload });
  }

  flushAll(consumer: InterruptConsumer): void {
    // Preserve FIFO ordering.
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) continue;

      switch (next.kind) {
        case "server_request":
          consumer.handleServerRequestNow?.(next.payload);
          break;
        case "exec_begin":
          consumer.handleExecBeginNow?.(next.payload);
          break;
        case "exec_end":
          consumer.handleExecEndNow?.(next.payload);
          break;
        case "mcp_begin":
          consumer.handleMcpBeginNow?.(next.payload);
          break;
        case "mcp_end":
          consumer.handleMcpEndNow?.(next.payload);
          break;
        case "patch_end":
          consumer.handlePatchApplyEndNow?.(next.payload);
          break;
        case "request_permissions":
          consumer.handleRequestPermissionsNow?.(next.payload);
          break;
        case "request_user_input":
          consumer.handleRequestUserInputNow?.(next.payload);
          break;
        case "elicitation":
          consumer.handleElicitationRequestNow?.(next.payload);
          break;
        case "exec_approval":
          consumer.handleExecApprovalNow?.(next.payload);
          break;
        case "apply_patch_approval":
          consumer.handleApplyPatchApprovalNow?.(next.payload);
          break;
      }
    }
  }
}
