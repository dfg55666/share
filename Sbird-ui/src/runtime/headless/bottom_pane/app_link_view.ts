// Web Phase 1 port of `tuitoweb/src/bottom_pane/app_link_view.rs`.
//
// The Rust TUI renders a bottom-pane modal that can:
// - open a ChatGPT app install/manage URL in the browser
// - toggle enable/disable for installed apps (connectors)
// - optionally resolve an "elicitation" (tool suggestion) request
//
// On the web we keep the same state machine and emit `AppEvent`s. Rendering is left to React.

import type { AppEventSender } from "../../internal/app_event_sender";
import type { CancellationEvent, BottomPaneView } from "./bottom_pane_view";

type AppLinkScreen = "link" | "install_confirmation";

export type AppLinkSuggestionType = "install" | "enable";

export type AppLinkElicitationTarget = {
  threadId: string;
  serverName: string;
  requestId: string;
};

export type AppLinkViewParams = {
  appId: string;
  title: string;
  description?: string | null;
  instructions: string;
  url: string;
  isInstalled: boolean;
  isEnabled: boolean;
  suggestReason?: string | null;
  suggestionType?: AppLinkSuggestionType | null;
  elicitationTarget?: AppLinkElicitationTarget | null;
};

export type AppLinkViewModel = {
  screen: AppLinkScreen;
  title: string;
  description: string | null;
  instructions: string;
  url: string;
  isInstalled: boolean;
  isEnabled: boolean;
  suggestReason: string | null;
  actions: string[];
  selectedAction: number;
};

function isDigitKey(key: string): key is "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" {
  return /^[1-9]$/.test(key);
}

export class AppLinkView implements BottomPaneView {
  private readonly appId: string;
  private readonly title: string;
  private readonly description: string | null;
  private readonly instructions: string;
  private readonly url: string;
  private isInstalled: boolean;
  private isEnabled: boolean;
  private readonly suggestReason: string | null;
  private readonly suggestionType: AppLinkSuggestionType | null;
  private readonly elicitationTarget: AppLinkElicitationTarget | null;
  private readonly appEventTx: AppEventSender;

  private screen: AppLinkScreen = "link";
  private selectedAction = 0;
  private complete = false;

  constructor(params: AppLinkViewParams, appEventTx: AppEventSender) {
    this.appId = params.appId;
    this.title = params.title;
    this.description = params.description?.trim() ? params.description.trim() : null;
    this.instructions = params.instructions ?? "";
    this.url = params.url ?? "";
    this.isInstalled = !!params.isInstalled;
    this.isEnabled = !!params.isEnabled;
    this.suggestReason = params.suggestReason?.trim() ? params.suggestReason.trim() : null;
    this.suggestionType = params.suggestionType ?? null;
    this.elicitationTarget = params.elicitationTarget ?? null;
    this.appEventTx = appEventTx;
  }

  model(): AppLinkViewModel {
    return {
      screen: this.screen,
      title: this.title,
      description: this.description,
      instructions: this.instructions,
      url: this.url,
      isInstalled: this.isInstalled,
      isEnabled: this.isEnabled,
      suggestReason: this.suggestReason,
      actions: this.actionLabels(),
      selectedAction: this.selectedAction,
    };
  }

  handleKeyEvent(event: KeyboardEvent): void {
    if (this.complete) return;
    const key = event.key;

    if (key === "Escape") {
      this.onCtrlC?.();
      return;
    }

    if (key === "ArrowUp" || key === "ArrowLeft" || key === "Tab" && event.shiftKey || key === "k" || key === "h") {
      this.moveSelectionPrev();
      return;
    }

    if (key === "ArrowDown" || key === "ArrowRight" || key === "Tab" && !event.shiftKey || key === "j" || key === "l") {
      this.moveSelectionNext();
      return;
    }

    if (isDigitKey(key)) {
      const idx = Number.parseInt(key, 10) - 1;
      const actions = this.actionLabels();
      if (idx >= 0 && idx < actions.length) {
        this.selectedAction = idx;
        this.activateSelectedAction();
      }
      return;
    }

    if (key === "Enter" && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.activateSelectedAction();
    }
  }

  onCtrlC(): CancellationEvent {
    if (this.isToolSuggestion()) {
      this.resolveElicitation("decline");
    }
    this.complete = true;
    return "Handled";
  }

  isComplete(): boolean {
    return this.complete;
  }

  private actionLabels(): string[] {
    if (this.screen === "link") {
      if (this.isInstalled) {
        return ["Manage on ChatGPT", this.isEnabled ? "Disable app" : "Enable app", "Back"];
      }
      return ["Install on ChatGPT", "Back"];
    }

    // install_confirmation
    return ["I already Installed it", "Back"];
  }

  private moveSelectionPrev(): void {
    this.selectedAction = Math.max(0, this.selectedAction - 1);
  }

  private moveSelectionNext(): void {
    const maxIdx = Math.max(0, this.actionLabels().length - 1);
    this.selectedAction = Math.min(maxIdx, this.selectedAction + 1);
  }

  private isToolSuggestion(): boolean {
    return this.elicitationTarget !== null;
  }

  private resolveElicitation(decision: "accept" | "decline"): void {
    const target = this.elicitationTarget;
    if (!target) return;
    this.appEventTx.send({
      type: "resolve_elicitation",
      threadId: target.threadId,
      serverName: target.serverName,
      requestId: target.requestId,
      decision,
      content: null,
      meta: null,
    });
  }

  private declineToolSuggestion(): void {
    this.resolveElicitation("decline");
    this.complete = true;
  }

  private openChatgptLink(): void {
    if (this.url) {
      this.appEventTx.send({ type: "open_url_in_browser", url: this.url });
    }
    if (!this.isInstalled) {
      this.screen = "install_confirmation";
      this.selectedAction = 0;
    }
  }

  private refreshConnectorsAndClose(): void {
    this.appEventTx.send({ type: "refresh_connectors", forceRefetch: true });
    if (this.isToolSuggestion()) {
      this.resolveElicitation("accept");
    }
    this.complete = true;
  }

  private backToLinkScreen(): void {
    this.screen = "link";
    this.selectedAction = 0;
  }

  private toggleEnabled(): void {
    this.isEnabled = !this.isEnabled;
    this.appEventTx.send({ type: "set_app_enabled", id: this.appId, enabled: this.isEnabled });
    if (this.isToolSuggestion()) {
      this.resolveElicitation("accept");
      this.complete = true;
    }
  }

  private activateSelectedAction(): void {
    if (this.isToolSuggestion()) {
      if (this.suggestionType === "enable") {
        if (this.screen === "link") {
          if (this.selectedAction === 0) {
            this.openChatgptLink();
          } else if (this.selectedAction === 1 && this.isInstalled) {
            this.toggleEnabled();
          } else {
            this.declineToolSuggestion();
          }
        } else {
          // install_confirmation
          if (this.selectedAction === 0) {
            this.refreshConnectorsAndClose();
          } else {
            this.declineToolSuggestion();
          }
        }
      } else {
        // install or unknown => treat as install flow
        if (this.screen === "link") {
          if (this.selectedAction === 0) {
            this.openChatgptLink();
          } else {
            this.declineToolSuggestion();
          }
        } else {
          if (this.selectedAction === 0) {
            this.refreshConnectorsAndClose();
          } else {
            this.declineToolSuggestion();
          }
        }
      }
      return;
    }

    if (this.screen === "link") {
      if (this.selectedAction === 0) {
        this.openChatgptLink();
      } else if (this.selectedAction === 1 && this.isInstalled) {
        this.toggleEnabled();
      } else {
        this.complete = true;
      }
      return;
    }

    // install_confirmation
    if (this.selectedAction === 0) {
      this.refreshConnectorsAndClose();
    } else {
      this.backToLinkScreen();
    }
  }
}
