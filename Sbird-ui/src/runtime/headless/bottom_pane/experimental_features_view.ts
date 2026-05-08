// Web Phase 1 port of `tuitoweb/src/bottom_pane/experimental_features_view.rs`.
//
// The Rust TUI renders a scrollable checklist of experimental features and persists them on exit.
// Web Phase 1 keeps the same selection + toggle + "save on close" semantics; rendering is done by React.

import type { AppEventSender } from "../../internal/app_event_sender";
import type { BottomPaneView, CancellationEvent } from "./bottom_pane_view";

// In Rust this is `codex_features::Feature`. On the web we keep it as an opaque string.
export type Feature = string;

export type ExperimentalFeatureItem = {
  feature: Feature;
  name: string;
  description: string;
  enabled: boolean;
};

export type ExperimentalFeaturesViewModel = {
  title: string;
  description: string;
  rows: Array<{ name: string; description: string; enabled: boolean; selected: boolean }>;
  selectedIndex: number | null;
  complete: boolean;
};

export class ExperimentalFeaturesView implements BottomPaneView {
  private readonly items: ExperimentalFeatureItem[];
  private readonly appEventTx: AppEventSender;
  private selectedIdx: number | null = null;
  private complete = false;

  constructor(items: ExperimentalFeatureItem[], appEventTx: AppEventSender) {
    this.items = items.slice();
    this.appEventTx = appEventTx;
    if (this.items.length > 0) {
      this.selectedIdx = 0;
    }
  }

  model(): ExperimentalFeaturesViewModel {
    return {
      title: "Experimental features",
      description: "Toggle experimental features. Changes are saved to config.toml.",
      rows: this.items.map((item, idx) => ({
        name: item.name,
        description: item.description,
        enabled: item.enabled,
        selected: this.selectedIdx === idx,
      })),
      selectedIndex: this.selectedIdx,
      complete: this.complete,
    };
  }

  handleKeyEvent(event: KeyboardEvent): void {
    if (this.complete) return;
    const key = event.key;

    if (key === "ArrowUp" || key === "k") {
      this.moveUp();
      return;
    }

    if (key === "ArrowDown" || key === "j") {
      this.moveDown();
      return;
    }

    if (key === " " && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.toggleSelected();
      return;
    }

    if (key === "Enter" || key === "Escape") {
      this.onCtrlC?.();
    }
  }

  onCtrlC(): CancellationEvent {
    // Persist updates (same as Rust: save on close).
    if (this.items.length > 0) {
      const updates: Array<[string, boolean]> = this.items.map((item) => [item.feature, item.enabled]);
      this.appEventTx.send({ type: "update_feature_flags", updates });
    }

    this.complete = true;
    return "Handled";
  }

  isComplete(): boolean {
    return this.complete;
  }

  private moveUp(): void {
    if (this.items.length === 0) return;
    if (this.selectedIdx === null) {
      this.selectedIdx = 0;
      return;
    }
    this.selectedIdx = this.selectedIdx <= 0 ? this.items.length - 1 : this.selectedIdx - 1;
  }

  private moveDown(): void {
    if (this.items.length === 0) return;
    if (this.selectedIdx === null) {
      this.selectedIdx = 0;
      return;
    }
    this.selectedIdx = this.selectedIdx >= this.items.length - 1 ? 0 : this.selectedIdx + 1;
  }

  private toggleSelected(): void {
    if (this.selectedIdx === null) return;
    const item = this.items[this.selectedIdx];
    if (!item) return;
    item.enabled = !item.enabled;
  }
}
