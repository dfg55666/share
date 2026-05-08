// Port of `tuitoweb/src/chatwidget/realtime.rs` (realtime voice conversation helpers).
//
// The upstream TUI supports realtime voice capture/playback on some platforms. The Web Phase 1
// client keeps the same state vocabulary and supports host-bridge integration.

export const REALTIME_CONVERSATION_PROMPT =
  "You are in a realtime voice conversation in the Codex TUI. Respond conversationally and concisely.";

export type RealtimeConversationPhase = "Inactive" | "Starting" | "Active" | "Stopping";

export type RealtimeConversationBridge = {
  isSupported?: () => boolean;
  startSession?: () => Promise<string>;
  stopSession?: (sessionId: string | null) => Promise<void>;
};

let realtimeBridge: RealtimeConversationBridge | null = null;

export function setRealtimeConversationBridge(bridge: RealtimeConversationBridge | null): void {
  realtimeBridge = bridge;
}

export class RealtimeConversationUiState {
  public phase: RealtimeConversationPhase = "Inactive";
  public requestedClose = false;
  public sessionId: string | null = null;
  public warnedAudioOnlySubmission = false;

  isLive(): boolean {
    return this.phase === "Starting" || this.phase === "Active" || this.phase === "Stopping";
  }

  isActive(): boolean {
    return this.phase === "Active";
  }
}

export type RenderedUserMessageEvent = {
  message: string;
  remoteImageUrls: string[];
  localImages: string[];
  textElements: Array<{ byteRange: { start: number; end: number }; placeholder?: string | null }>;
};

export type PendingSteerCompareKey = {
  message: string;
  imageCount: number;
};

// Minimal, schema-tolerant implementation of the compare-key builder.
export function pendingSteerCompareKeyFromInputs(items: Array<unknown>): PendingSteerCompareKey {
  let message = "";
  let imageCount = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const kind = (item as { kind?: unknown }).kind;
    if (kind === "text") {
      const text = (item as { text?: unknown }).text;
      if (typeof text === "string") {
        message += text;
      }
    } else if (kind === "image" || kind === "local_image") {
      imageCount += 1;
    }
  }

  return { message, imageCount };
}

function browserRealtimeSupport(): boolean {
  if (typeof window === "undefined") return false;
  const mediaDevices = (navigator as { mediaDevices?: unknown }).mediaDevices;
  const hasMicApi =
    typeof mediaDevices === "object" &&
    mediaDevices !== null &&
    typeof (mediaDevices as { getUserMedia?: unknown }).getUserMedia === "function";
  const hasSocket = typeof WebSocket !== "undefined";
  return hasMicApi && hasSocket;
}

export function isRealtimeVoiceSupported(): boolean {
  if (realtimeBridge?.isSupported) {
    return realtimeBridge.isSupported();
  }
  return browserRealtimeSupport();
}

function fallbackSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rt-${Date.now()}`;
}

export async function startRealtimeConversation(
  state: RealtimeConversationUiState,
): Promise<boolean> {
  if (state.isLive()) return true;
  if (!isRealtimeVoiceSupported()) return false;

  state.phase = "Starting";
  state.requestedClose = false;

  try {
    const sessionId = realtimeBridge?.startSession
      ? await realtimeBridge.startSession()
      : fallbackSessionId();
    state.sessionId = sessionId;
    state.phase = "Active";
    return true;
  } catch {
    state.phase = "Inactive";
    state.sessionId = null;
    return false;
  }
}

export async function stopRealtimeConversation(
  state: RealtimeConversationUiState,
): Promise<void> {
  if (!state.isLive()) return;

  state.phase = "Stopping";
  state.requestedClose = true;
  try {
    await realtimeBridge?.stopSession?.(state.sessionId);
  } finally {
    state.phase = "Inactive";
    state.sessionId = null;
  }
}
