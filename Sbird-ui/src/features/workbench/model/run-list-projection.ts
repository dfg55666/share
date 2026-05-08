import type { EngineRunSnapshot, ThreadSummary } from '../../../api/contracts';
import type { ThreadGroup } from '../../threads/ui/ThreadList';

const WORKFLOW_LABEL_BY_KEY: Record<string, string> = {
  yinzhan: '印占',
  liuyao: '六爻',
};

const WORKFLOW_ORDER = ['yinzhan', 'liuyao'];

type RunProjectionParams = {
  runs: EngineRunSnapshot[];
  threads: ThreadSummary[];
  selectedThreadId: string;
};

export type RunListProjection = {
  groups: ThreadGroup[];
  selectedRunId: string;
  runIdToThreadId: Record<string, string>;
  runById: Record<string, EngineRunSnapshot>;
};

type GroupBucket = {
  key: string;
  label: string;
  index: number;
  threads: ThreadGroup['threads'];
};

function normalize(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function resolveWorkflowLabel(workflowKey: string): string {
  return WORKFLOW_LABEL_BY_KEY[workflowKey] ?? (workflowKey || '其他');
}

function pickThreadIdForRun(
  run: EngineRunSnapshot,
  threadById: Map<string, ThreadSummary>,
  firstThreadByRunId: Record<string, string>,
): string {
  const agents = run.agentSessions?.agents ?? {};
  const candidates = [
    normalize(run.currentAgent),
    normalize(run.agentSessions?.entryAgent),
    ...Object.keys(agents),
  ];

  for (const agentId of candidates) {
    if (!agentId) continue;
    const threadId = normalize(agents[agentId]?.threadId);
    if (threadId && threadById.has(threadId)) {
      return threadId;
    }
  }

  return normalize(firstThreadByRunId[run.runId]);
}

function buildRunTitle(run: EngineRunSnapshot, mappedThread?: ThreadSummary): string {
  const baseTitle = normalize(mappedThread?.title) || run.runId;
  const status = normalize(run.status);
  const step = normalize(run.currentStep);
  const tags: string[] = [];
  if (run.activeInProcess) {
    tags.push('运行中');
  } else if (status) {
    tags.push(status);
  }
  if (step) {
    tags.push(step);
  }
  return tags.length > 0 ? `${baseTitle}（${tags.join(' / ')}）` : baseTitle;
}

export function projectRunList({
  runs,
  threads,
  selectedThreadId,
}: RunProjectionParams): RunListProjection {
  const threadById = new Map<string, ThreadSummary>();
  const firstThreadByRunId: Record<string, string> = {};

  for (const thread of threads) {
    threadById.set(thread.id, thread);
    const runId = normalize(thread.projectName);
    if (!runId) continue;
    if (!firstThreadByRunId[runId]) {
      firstThreadByRunId[runId] = thread.id;
    }
  }

  const selectedRunId =
    threads.find((thread) => thread.id === selectedThreadId)?.projectName ?? '';

  const buckets = new Map<string, GroupBucket>();
  const runIdToThreadId: Record<string, string> = {};
  const runById: Record<string, EngineRunSnapshot> = {};

  for (const run of runs) {
    const runId = normalize(run.runId);
    if (!runId) continue;
    runById[runId] = run;

    const mappedThreadId = pickThreadIdForRun(run, threadById, firstThreadByRunId);
    if (!mappedThreadId) {
      continue;
    }
    runIdToThreadId[runId] = mappedThreadId;

    const workflowKey = normalize(run.workflowKey);
    const normalizedGroupKey = workflowKey || 'other';
    const existingBucket = buckets.get(normalizedGroupKey);
    const groupIndex = Math.max(0, WORKFLOW_ORDER.indexOf(normalizedGroupKey));

    const bucket =
      existingBucket ??
      {
        key: normalizedGroupKey,
        label: resolveWorkflowLabel(workflowKey),
        index: groupIndex,
        threads: [],
      };

    const mappedThread = threadById.get(mappedThreadId);
    bucket.threads.push({
      id: runId,
      title: buildRunTitle(run, mappedThread),
      active: runId === selectedRunId,
    });

    buckets.set(normalizedGroupKey, bucket);
  }

  const groups = [...buckets.values()]
    .sort((left, right) => {
      const leftInOrder = WORKFLOW_ORDER.includes(left.key);
      const rightInOrder = WORKFLOW_ORDER.includes(right.key);
      if (leftInOrder && rightInOrder) {
        return left.index - right.index;
      }
      if (leftInOrder) return -1;
      if (rightInOrder) return 1;
      return left.label.localeCompare(right.label);
    })
    .map((bucket) => ({
      label: bucket.label,
      threads: bucket.threads,
    }));

  return {
    groups,
    selectedRunId,
    runIdToThreadId,
    runById,
  };
}
