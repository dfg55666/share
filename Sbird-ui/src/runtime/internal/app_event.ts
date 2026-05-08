import type {
  ThreadSendMode,
  UiTimelineEvent,
  UiTimelineSnapshot,
} from "../../api/contracts";
import type { ServerRequestReply } from "../../domain/server-request";
import type { HistoryCell } from "../headless/chatwidget/history_cell";
import type { FeedbackCategory } from "../headless/bottom_pane/feedback_view";

export type AppEvent =
  | { type: "bootstrap" }
  | { type: "select_thread"; threadId: string }
  | { type: "snapshot_loaded"; threadId: string; snapshot: UiTimelineSnapshot }
  | { type: "timeline_event"; threadId: string; event: UiTimelineEvent }
  | { type: "send_message"; threadId: string; content: string; mode: ThreadSendMode }
  | { type: "interrupt"; threadId: string }
  | { type: "rollback"; threadId: string; numTurns: number }
  | { type: "rename_thread"; threadId: string; name: string }
  | { type: "archive_thread"; threadId: string }
  | { type: "fork_thread"; threadId: string }
  | {
      type: "respond_server_request";
      threadId: string;
      requestId: number;
      reply: ServerRequestReply;
    }
  | { type: "open_url_in_browser"; url: string }
  | { type: "refresh_connectors"; forceRefetch: boolean }
  | { type: "set_app_enabled"; id: string; enabled: boolean }
  | {
      type: "resolve_elicitation";
      threadId: string;
      serverName: string;
      requestId: string;
      decision: "accept" | "decline";
      content: string | null;
      meta: unknown | null;
    }
  | { type: "update_feature_flags"; updates: Array<[string, boolean]> }
  | { type: "open_feedback_consent"; category: FeedbackCategory }
  | { type: "open_feedback_note"; category: FeedbackCategory; includeLogs: boolean }
  | { type: "insert_history_cell"; cell: HistoryCell }
  | { type: "stream_disconnected"; threadId: string; reason: string }
  | { type: "error"; message: string };

export type AppEventHandler = (event: AppEvent) => void;
