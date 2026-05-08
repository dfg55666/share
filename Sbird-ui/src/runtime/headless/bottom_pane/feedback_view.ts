// Web Phase 1 port of `tuitoweb/src/bottom_pane/feedback_view.rs`.
//
// The upstream CLI uploads logs + rollout and then inserts a HistoryCell with follow-up links.
// In the browser build we preserve:
// - the selection popup params (categories + upload consent prompt)
// - the note entry overlay state machine
// - follow-up link generation (GitHub issue template / internal link)
//
// Actual log collection and upload are intentionally deferred/unsupported in Web Phase 1.

import type { AppEventSender } from "../../internal/app_event_sender";
import type { RtLine } from "../render/line_utils";
import { PlainHistoryCell } from "../chatwidget/history_cell";
import { standardPopupHintLine } from "./popup_consts";
import type { SelectionItem, SelectionViewParams } from "./list_selection_view";
import type { BottomPaneView, CancellationEvent } from "./bottom_pane_view";

const BASE_CLI_BUG_ISSUE_URL =
  "https://github.com/openai/codex/issues/new?template=3-cli.yml";

// Internal routing link for employee feedback follow-ups. Must not be shown to external users.
const CODEX_FEEDBACK_INTERNAL_URL = "http://go/codex-feedback-internal";

export type FeedbackAudience = "OpenAiEmployee" | "External";

export type FeedbackCategory = "Bug" | "BadResult" | "GoodResult" | "SafetyCheck" | "Other";

function feedbackClassification(category: FeedbackCategory): string {
  switch (category) {
    case "BadResult":
      return "bad_result";
    case "GoodResult":
      return "good_result";
    case "Bug":
      return "bug";
    case "SafetyCheck":
      return "safety_check";
    case "Other":
      return "other";
  }
}

function slackFeedbackUrl(_threadId: string): string {
  return CODEX_FEEDBACK_INTERNAL_URL;
}

function issueUrlForCategory(
  category: FeedbackCategory,
  threadId: string,
  audience: FeedbackAudience,
): string | null {
  if (category === "GoodResult") {
    return null;
  }
  if (audience === "OpenAiEmployee") {
    return slackFeedbackUrl(threadId);
  }
  return `${BASE_CLI_BUG_ISSUE_URL}&steps=Uploaded%20thread:%20${encodeURIComponent(threadId)}`;
}

function textLine(content: string): RtLine {
  return { spans: [{ content }] };
}

function makeFeedbackItem(
  appEventTx: AppEventSender,
  name: string,
  description: string,
  category: FeedbackCategory,
): SelectionItem {
  return {
    name,
    description,
    dismissOnSelect: true,
    actions: [
      () => {
        appEventTx.send({ type: "open_feedback_consent", category });
      },
    ],
  };
}

export function feedbackSelectionParams(appEventTx: AppEventSender): SelectionViewParams {
  return {
    title: "How was this?",
    items: [
      makeFeedbackItem(appEventTx, "bug", "Crash, error message, hang, or broken UI/behavior.", "Bug"),
      makeFeedbackItem(
        appEventTx,
        "bad result",
        "Output was off-target, incorrect, incomplete, or unhelpful.",
        "BadResult",
      ),
      makeFeedbackItem(
        appEventTx,
        "good result",
        "Helpful, correct, high-quality, or delightful result worth celebrating.",
        "GoodResult",
      ),
      makeFeedbackItem(
        appEventTx,
        "safety check",
        "Benign usage blocked due to safety checks or refusals.",
        "SafetyCheck",
      ),
      makeFeedbackItem(
        appEventTx,
        "other",
        "Slowness, feature suggestion, UX feedback, or anything else.",
        "Other",
      ),
    ],
  };
}

export function feedbackDisabledParams(): SelectionViewParams {
  return {
    title: "Sending feedback is disabled",
    subtitle: "This action is disabled by configuration.",
    footerHint: standardPopupHintLine(),
    items: [{ name: "Close", dismissOnSelect: true }],
  };
}

export function feedbackUploadConsentParams(opts: {
  appEventTx: AppEventSender;
  category: FeedbackCategory;
  rolloutPath?: string | null;
  attachments?: string[];
}): SelectionViewParams {
  const { appEventTx, category, rolloutPath } = opts;
  const title = "Upload logs?";

  const baseItems: SelectionItem[] = [
    {
      name: "Yes (include logs)",
      description: "Attach diagnostic logs to help us debug.",
      dismissOnSelect: true,
      actions: [() => appEventTx.send({ type: "open_feedback_note", category, includeLogs: true })],
    },
    {
      name: "No (no logs)",
      description: "Send feedback without uploading logs.",
      dismissOnSelect: true,
      actions: [() => appEventTx.send({ type: "open_feedback_note", category, includeLogs: false })],
    },
  ];

  const subtitle = rolloutPath ? `Will include: ${rolloutPath}` : "Browser build cannot auto-collect CLI logs.";

  return {
    title,
    subtitle,
    footerHint: standardPopupHintLine(),
    items: baseItems,
  };
}

export class FeedbackNoteView implements BottomPaneView {
  private readonly threadId: string;
  private readonly category: FeedbackCategory;
  private readonly appEventTx: AppEventSender;
  private readonly includeLogs: boolean;
  private readonly audience: FeedbackAudience;

  private note = "";
  private complete = false;

  constructor(opts: {
    threadId: string;
    category: FeedbackCategory;
    appEventTx: AppEventSender;
    includeLogs: boolean;
    audience: FeedbackAudience;
  }) {
    this.threadId = opts.threadId;
    this.category = opts.category;
    this.appEventTx = opts.appEventTx;
    this.includeLogs = opts.includeLogs;
    this.audience = opts.audience;
  }

  setNote(text: string): void {
    this.note = text ?? "";
  }

  handleKeyEvent(event: KeyboardEvent): void {
    if (this.complete) return;
    if (event.key === "Escape") {
      this.onCtrlC?.();
      return;
    }
    if (event.key === "Enter" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
      this.submit();
    }
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
    this.note += pasted;
    return true;
  }

  private submit(): void {
    const classification = feedbackClassification(this.category);
    const issueUrl = issueUrlForCategory(this.category, this.threadId, this.audience);

    const lines: RtLine[] = [];
    const prefix = this.includeLogs ? "• Feedback recorded (web, no logs uploaded)." : "• Feedback recorded (no logs).";
    lines.push(textLine(prefix));
    lines.push(textLine(`  category: ${classification}`));
    if (this.note.trim()) {
      lines.push(textLine(""));
      lines.push(textLine("  note:"));
      for (const part of this.note.trim().split(/\r?\n/)) {
        lines.push(textLine(`    ${part}`));
      }
    }
    if (issueUrl) {
      lines.push(textLine(""));
      lines.push(textLine(`  follow-up: ${issueUrl}`));
    } else {
      lines.push(textLine(""));
      lines.push(textLine(`  thread: ${this.threadId}`));
    }

    this.appEventTx.send({
      type: "insert_history_cell",
      cell: new PlainHistoryCell(lines),
    });

    this.complete = true;
  }
}

export { FeedbackNoteView as FeedbackNoteViewModelOnly };
