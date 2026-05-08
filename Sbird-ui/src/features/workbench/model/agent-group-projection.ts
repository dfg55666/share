import type {
  EngineRunSnapshot,
  UiServerRequest,
  UiTimelineItem,
} from '../../../api/contracts';
import type { TimelineMutableState } from '../../../domain/timeline';

const MAX_CONTENT_LENGTH = 1800;
const MAX_STEP_LENGTH = 1200;

type ToolCallStatus = 'success' | 'loading' | 'error';

type ThinkingTimelineItem =
  | { type: 'step'; text: string }
  | {
      type: 'tool';
      label: string;
      name: string;
      status: ToolCallStatus;
    };

export type WorkbenchTimelineMessage = {
  id: string;
  role: 'user' | 'agent';
  senderName: string;
  senderTag?: string;
  time: string;
  content: string;
  thinking?: {
    steps: { text: string }[];
    toolCalls?: {
      label: string;
      name: string;
      status: ToolCallStatus;
    }[];
    items?: ThinkingTimelineItem[];
  };
};

type ProjectionParams = {
  selectedRun?: EngineRunSnapshot;
  timelineByThreadId?: Record<string, TimelineMutableState>;
  fallbackTimeline?: TimelineMutableState;
};

type AgentThreadContext = {
  agentId: string;
  threadId: string;
  threadName: string;
};

type TimelineEntry =
  | {
      kind: 'item';
      id: string;
      displaySeq: number;
      createdAtIso: string;
      thread: AgentThreadContext;
      item: UiTimelineItem;
    }
  | {
      kind: 'request';
      id: string;
      displaySeq: number;
      createdAtIso: string;
      thread: AgentThreadContext;
      request: UiServerRequest;
    };

type SegmentToolCall = {
  label: string;
  name: string;
  status: ToolCallStatus;
};

type AgentSegment = {
  id: string;
  agentId: string;
  senderName: string;
  startedAtIso: string;
  lastAtIso: string;
  events: Array<
    | { type: 'step'; text: string }
    | { type: 'tool'; toolCall: SegmentToolCall }
    | { type: 'body'; text: string }
  >;
  hasFinalBody: boolean;
  hasInProgressSignal: boolean;
};

type ItemProjection = {
  step?: string;
  toolCall?: SegmentToolCall;
  finalBody?: string;
  inProgress: boolean;
};

function normalize(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function safeJsonSnippet(value: unknown, maxLength = 360): string {
  try {
    const text = JSON.stringify(value);
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
  } catch {
    return '';
  }
}

function clampContent(content: string, maxLength = MAX_CONTENT_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}\n…(内容已截断)`;
}

function toTimeLabel(createdAtIso: string): string {
  if (!createdAtIso) {
    return new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  const date = new Date(createdAtIso);
  if (Number.isNaN(date.getTime())) {
    return createdAtIso;
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function entrySortId(entry: TimelineEntry): string {
  return `${entry.thread.threadId}:${entry.id}`;
}

function sortEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((left, right) => {
    if (left.displaySeq !== right.displaySeq) {
      return left.displaySeq - right.displaySeq;
    }
    if (left.createdAtIso !== right.createdAtIso) {
      return left.createdAtIso.localeCompare(right.createdAtIso);
    }
    return entrySortId(left).localeCompare(entrySortId(right));
  });
}

function isUserItem(item: UiTimelineItem): boolean {
  return item.itemType === 'user-message' || item.role === 'user';
}

function itemCreatedAtIso(item: UiTimelineItem): string {
  return normalize(item.createdAtIso);
}

function inProgressStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'inprogress' ||
    normalized === 'in_progress' ||
    normalized === 'pending' ||
    normalized === 'running'
  );
}

function isInProgressItem(item: UiTimelineItem): boolean {
  if (!item.completed) {
    return true;
  }
  if (inProgressStatus(normalize(item.status))) {
    return true;
  }
  if (item.commandExecution?.status === 'inProgress') {
    return true;
  }
  if (inProgressStatus(normalize(item.toolCall?.status))) {
    return true;
  }
  return false;
}

function mapToolStatus(params: {
  status?: string;
  completed?: boolean;
}): ToolCallStatus {
  const normalized = normalize(params.status).toLowerCase();
  if (
    normalized === 'failed' ||
    normalized === 'error' ||
    normalized === 'declined' ||
    normalized === 'interrupted'
  ) {
    return 'error';
  }
  if (
    normalized === 'inprogress' ||
    normalized === 'in_progress' ||
    normalized === 'pending' ||
    normalized === 'running'
  ) {
    return 'loading';
  }
  if (params.completed === false) {
    return 'loading';
  }
  return 'success';
}

function summarizeRequest(request: UiServerRequest): string {
  const method = normalize(request.method) || 'server_request';
  const paramsSnippet = safeJsonSnippet(request.params, 420);
  if (!paramsSnippet) {
    return '';
  }
  return `参数：${paramsSnippet}`;
}

function summarizeUnknownItem(item: UiTimelineItem): string {
  const text = normalize(item.text);
  if (text) return text;
  const payload = normalize(item.rawPayload);
  if (payload) return `事件：${item.itemType}\n${payload}`;
  return `事件：${item.itemType}`;
}

function isAssistantReportItem(item: UiTimelineItem): boolean {
  if (item.itemType === 'assistant-message') {
    return true;
  }
  return item.itemType === 'worked' && item.role === 'assistant';
}

function projectItem(item: UiTimelineItem): ItemProjection {
  const text = normalize(item.text);
  const inProgress = isInProgressItem(item);

  if (isAssistantReportItem(item)) {
    if (!inProgress && text) {
      return {
        finalBody: text,
        inProgress: false,
      };
    }
    return {
      step: text ? `过程输出\n${text}` : '过程输出（暂无文本）',
      inProgress,
    };
  }

  if (item.itemType === 'reasoning') {
    return {
      step: text ? `思考\n${text}` : '思考（暂无文本）',
      inProgress,
    };
  }

  if (item.itemType === 'exec') {
    const command = normalize(item.commandExecution?.command);
    const output = normalize(item.commandExecution?.aggregatedOutput) || text;
    const status = item.commandExecution?.status ?? item.status;
    return {
      step: output || undefined,
      toolCall: {
        label: '命令执行',
        name: command || 'shell',
        status: mapToolStatus({
          status,
          completed: item.completed,
        }),
      },
      inProgress,
    };
  }

  if (item.itemType === 'mcp-tool-call') {
    const server = normalize(item.mcpToolCall?.server);
    const tool = normalize(item.mcpToolCall?.tool);
    const name = [server, tool].filter(Boolean).join('/') || text || 'unknown';
    const resultSnippet = safeJsonSnippet(item.mcpToolCall?.result, 320);
    return {
      step: resultSnippet ? `MCP 结果\n${resultSnippet}` : undefined,
      toolCall: {
        label: 'MCP 调用',
        name,
        status: mapToolStatus({
          status: item.status,
          completed: item.completed,
        }),
      },
      inProgress,
    };
  }

  if (item.itemType === 'tool-call') {
    const label = normalize(item.toolCall?.label) || '工具调用';
    const name = normalize(item.toolCall?.kind) || label;
    const details = safeJsonSnippet(item.toolCall?.details, 320);
    return {
      step: details || undefined,
      toolCall: {
        label,
        name,
        status: mapToolStatus({
          status: item.toolCall?.status ?? item.status,
          completed: item.completed,
        }),
      },
      inProgress,
    };
  }

  if (item.itemType === 'worked') {
    return {
      step: text || summarizeUnknownItem(item),
      inProgress,
    };
  }

  return {
    step: summarizeUnknownItem(item),
    inProgress,
  };
}

function createSegment(entry: TimelineEntry, index: number): AgentSegment {
  const senderName =
    normalize(entry.thread.threadName) || normalize(entry.thread.agentId) || 'Agent';
  return {
    id: `segment-${entry.thread.threadId}-${entry.id}-${index}`,
    agentId: entry.thread.agentId,
    senderName,
    startedAtIso: entry.createdAtIso,
    lastAtIso: entry.createdAtIso,
    events: [],
    hasFinalBody: false,
    hasInProgressSignal: false,
  };
}

function buildSegmentMessage(segment: AgentSegment): WorkbenchTimelineMessage {
  let finalBodyIndex = -1;
  segment.events.forEach((event, index) => {
    if (event.type === 'body') {
      finalBodyIndex = index;
    }
  });

  const finalBodyEvent =
    finalBodyIndex >= 0 ? segment.events[finalBodyIndex] : undefined;
  const finalBody = finalBodyEvent?.type === 'body' ? finalBodyEvent.text : '';
  const content = finalBody || (segment.hasInProgressSignal ? '处理中…' : '等待输出…');
  const orderedItems: ThinkingTimelineItem[] = segment.events
    .filter((_, index) => index !== finalBodyIndex)
    .map((event): ThinkingTimelineItem => {
      if (event.type === 'tool') {
        return { type: 'tool', ...event.toolCall };
      }
      return {
        type: 'step',
        text: clampContent(
          event.type === 'body' ? `过程输出\n${event.text}` : event.text,
          MAX_STEP_LENGTH,
        ),
      };
    })
    .filter((item) => item.type === 'tool' || item.text.length > 0);

  const thinkingSteps = orderedItems
    .filter((item): item is Extract<ThinkingTimelineItem, { type: 'step' }> => item.type === 'step')
    .map((item) => ({ text: item.text }));
  const toolCalls = orderedItems
    .filter((item): item is Extract<ThinkingTimelineItem, { type: 'tool' }> => item.type === 'tool')
    .map(({ label, name, status }) => ({ label, name, status }));

  const thinking =
    orderedItems.length > 0
      ? {
          steps: thinkingSteps,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          items: orderedItems,
        }
      : undefined;

  return {
    id: segment.id,
    role: 'agent',
    senderName: segment.senderName,
    senderTag: 'Agent',
    time: toTimeLabel(segment.lastAtIso || segment.startedAtIso),
    content: clampContent(content),
    thinking,
  };
}

function collectRunEntries(params: {
  selectedRun: EngineRunSnapshot;
  timelineByThreadId: Record<string, TimelineMutableState>;
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const agents = params.selectedRun.agentSessions?.agents ?? {};
  const seenThreadIds = new Set<string>();

  for (const [agentId, session] of Object.entries(agents)) {
    const threadId = normalize(session.threadId);
    if (!threadId || seenThreadIds.has(threadId)) continue;
    seenThreadIds.add(threadId);
    const timeline = params.timelineByThreadId[threadId];
    if (!timeline) continue;

    const thread: AgentThreadContext = {
      agentId,
      threadId,
      threadName: normalize(session.threadName) || agentId,
    };

    for (const item of timeline.items) {
      entries.push({
        kind: 'item',
        id: `item-${threadId}-${item.id}`,
        displaySeq:
          typeof item.displaySeq === 'number' ? item.displaySeq : Number.MAX_SAFE_INTEGER,
        createdAtIso: itemCreatedAtIso(item),
        thread,
        item,
      });
    }

    for (const request of timeline.pendingRequests) {
      entries.push({
        kind: 'request',
        id: `request-${threadId}-${request.id}`,
        displaySeq:
          typeof request.displaySeq === 'number'
            ? request.displaySeq
            : Number.MAX_SAFE_INTEGER,
        createdAtIso: normalize(request.receivedAtIso),
        thread,
        request,
      });
    }
  }

  return sortEntries(entries);
}

function collectFallbackEntries(timeline?: TimelineMutableState): TimelineEntry[] {
  if (!timeline) return [];
  const thread: AgentThreadContext = {
    agentId: 'assistant',
    threadId: normalize(timeline.threadId) || 'selected',
    threadName: 'Assistant',
  };
  const entries: TimelineEntry[] = [];

  for (const item of timeline.items) {
    entries.push({
      kind: 'item',
      id: `item-${thread.threadId}-${item.id}`,
      displaySeq:
        typeof item.displaySeq === 'number' ? item.displaySeq : Number.MAX_SAFE_INTEGER,
      createdAtIso: itemCreatedAtIso(item),
      thread,
      item,
    });
  }

  for (const request of timeline.pendingRequests) {
    entries.push({
      kind: 'request',
      id: `request-${thread.threadId}-${request.id}`,
      displaySeq:
        typeof request.displaySeq === 'number'
          ? request.displaySeq
          : Number.MAX_SAFE_INTEGER,
      createdAtIso: normalize(request.receivedAtIso),
      thread,
      request,
    });
  }

  return sortEntries(entries);
}

export function projectAgentGroupTimelineMessages({
  selectedRun,
  timelineByThreadId,
  fallbackTimeline,
}: ProjectionParams): WorkbenchTimelineMessage[] {
  const runEntries =
    selectedRun && timelineByThreadId
      ? collectRunEntries({
          selectedRun,
          timelineByThreadId,
        })
      : [];
  const entries = runEntries.length > 0 ? runEntries : collectFallbackEntries(fallbackTimeline);
  if (entries.length === 0) {
    return [];
  }

  const messages: WorkbenchTimelineMessage[] = [];
  let currentSegment: AgentSegment | null = null;
  const seenUserTurnIds = new Set<string>();

  const flushSegment = () => {
    if (!currentSegment) return;
    messages.push(buildSegmentMessage(currentSegment));
    currentSegment = null;
  };

  entries.forEach((entry, index) => {
    if (entry.kind === 'item' && isUserItem(entry.item)) {
      flushSegment();
      const userTurnId = normalize(entry.item.turnId);
      // A run baseline can contain the same user input in multiple agent threads.
      // Render that shared input once in the group chat instead of duplicating it per agent.
      if (userTurnId) {
        if (seenUserTurnIds.has(userTurnId)) {
          return;
        }
        seenUserTurnIds.add(userTurnId);
      }
      const text = normalize(entry.item.text);
      messages.push({
        id: `user-${entry.thread.threadId}-${entry.item.id}-${index}`,
        role: 'user',
        senderName: '你',
        time: toTimeLabel(entry.createdAtIso),
        content: clampContent(text || '(空消息)'),
      });
      return;
    }

    const shouldStartNewSegment =
      !currentSegment ||
      currentSegment.agentId !== entry.thread.agentId ||
      (currentSegment.hasFinalBody &&
        (entry.kind === 'request' ||
          (entry.kind === 'item' && !isAssistantReportItem(entry.item))));

    if (shouldStartNewSegment) {
      flushSegment();
      currentSegment = createSegment(entry, index);
    }

    if (!currentSegment) {
      return;
    }
    currentSegment.lastAtIso = entry.createdAtIso || currentSegment.lastAtIso;

    if (entry.kind === 'request') {
      currentSegment.hasInProgressSignal = true;
      currentSegment.events.push({
        type: 'tool',
        toolCall: {
          label: '待处理请求',
          name: normalize(entry.request.method) || `request#${entry.request.id}`,
          status: 'loading',
        },
      });
      currentSegment.events.push({ type: 'step', text: summarizeRequest(entry.request) });
      return;
    }

    const projected = projectItem(entry.item);
    if (projected.finalBody) {
      currentSegment.events.push({ type: 'body', text: projected.finalBody });
      currentSegment.hasFinalBody = true;
    }
    if (projected.toolCall) {
      currentSegment.events.push({ type: 'tool', toolCall: projected.toolCall });
    }
    if (projected.step) {
      currentSegment.events.push({ type: 'step', text: projected.step });
    }
    if (projected.inProgress) {
      currentSegment.hasInProgressSignal = true;
    }
  });

  flushSegment();
  return messages;
}
