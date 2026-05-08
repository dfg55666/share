// Web Phase 1 port of `tuitoweb/src/bottom_pane/custom_prompt_view.rs`.
//
// Rust renders a minimal multi-line input overlay. In the browser, text editing is handled by
// DOM inputs; this file keeps the same submit/cancel state machine so callers can keep the same
// control flow (BottomPane view stack).

import type { CancellationEvent, BottomPaneView } from "./bottom_pane_view";

export type PromptSubmitted = (text: string) => void;

export type CustomPromptViewModel = {
  title: string;
  placeholder: string;
  contextLabel: string | null;
  text: string;
  complete: boolean;
};

export class CustomPromptView implements BottomPaneView {
  private readonly title: string;
  private readonly placeholder: string;
  private readonly contextLabel: string | null;
  private readonly onSubmit: PromptSubmitted;

  private text = "";
  private complete = false;

  constructor(opts: {
    title: string;
    placeholder: string;
    contextLabel?: string | null;
    onSubmit: PromptSubmitted;
    initialText?: string;
  }) {
    this.title = opts.title;
    this.placeholder = opts.placeholder;
    this.contextLabel = opts.contextLabel ?? null;
    this.onSubmit = opts.onSubmit;
    this.text = opts.initialText ?? "";
  }

  model(): CustomPromptViewModel {
    return {
      title: this.title,
      placeholder: this.placeholder,
      contextLabel: this.contextLabel,
      text: this.text,
      complete: this.complete,
    };
  }

  setText(text: string): void {
    this.text = text ?? "";
  }

  handleKeyEvent(event: KeyboardEvent): void {
    if (this.complete) return;
    if (event.key === "Escape") {
      this.onCtrlC?.();
      return;
    }

    if (event.key === "Enter" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
      const trimmed = this.text.trim();
      if (!trimmed) return;
      this.onSubmit(trimmed);
      this.complete = true;
      return;
    }

    // All other editing is handled by the DOM input; this model only tracks text via `setText`.
  }

  onCtrlC(): CancellationEvent {
    this.complete = true;
    return "Handled";
  }

  isComplete(): boolean {
    return this.complete;
  }

  handlePaste(pasted: string): boolean {
    if (!pasted) return false;
    this.text += pasted;
    return true;
  }
}
