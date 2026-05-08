import React from 'react';
import type { EngineRunSnapshot } from '../../../api/contracts';
import {
  createAppRuntime,
  useRuntimeStore,
  type AppRuntimeState,
  type ThreadSyncPhase,
} from '../../../runtime';
import { createDefaultAppServerSession } from '../../../runtime/internal/app_server_adapter';
import {
  projectRunList,
  type RunListProjection,
} from './run-list-projection';
import {
  projectTimelineMessages,
  type WorkbenchTimelineMessage,
} from './chat-timeline-projection';

function stableSession() {
  return createDefaultAppServerSession();
}

export type WorkbenchRuntimeBridge = {
  state: AppRuntimeState;
  runs: EngineRunSnapshot[];
  runProjection: RunListProjection;
  timelineMessages: WorkbenchTimelineMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  sendMessage: (text?: string) => Promise<void>;
  sendDisabled: boolean;
  syncPhase: ThreadSyncPhase;
  syncNotice: string;
  loadingRuns: boolean;
  runsError: string;
  reloadRuns: () => Promise<void>;
  selectRun: (runId: string) => Promise<void>;
};

export function useWorkbenchRuntime(): WorkbenchRuntimeBridge {
  const [session] = React.useState(stableSession);
  const [runtime] = React.useState(() => createAppRuntime(session));
  const state = useRuntimeStore(runtime);
  const [runs, setRuns] = React.useState<EngineRunSnapshot[]>([]);
  const [loadingRuns, setLoadingRuns] = React.useState(false);
  const [runsError, setRunsError] = React.useState('');
  const [draftByThreadId, setDraftByThreadId] = React.useState<Record<string, string>>({});

  const reloadRuns = React.useCallback(async () => {
    setLoadingRuns(true);
    setRunsError('');
    try {
      const snapshots = await session.listRuns();
      setRuns(snapshots);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : 'Failed to load run list');
    } finally {
      setLoadingRuns(false);
    }
  }, [session]);

  React.useEffect(() => {
    let active = true;
    void runtime
      .bootstrap()
      .then(async () => {
        if (!active) return;
        await reloadRuns();
      })
      .catch((error) => {
        if (!active) return;
        setRunsError(error instanceof Error ? error.message : 'Failed to bootstrap runtime');
      });
    return () => {
      active = false;
      runtime.dispose();
    };
  }, [reloadRuns, runtime]);

  const runProjection = React.useMemo(
    () =>
      projectRunList({
        runs,
        threads: state.threads,
        selectedThreadId: state.selectedThreadId,
      }),
    [runs, state.selectedThreadId, state.threads],
  );

  const selectedRun = runProjection.selectedRunId
    ? runProjection.runById[runProjection.selectedRunId]
    : undefined;
  const selectedThreadId = state.selectedThreadId.trim();
  const selectedTimeline = selectedThreadId
    ? state.timelineByThreadId[selectedThreadId]
    : undefined;

  const timelineMessages = React.useMemo(
    () =>
      projectTimelineMessages({
        fallbackTimeline: selectedTimeline,
        selectedRun,
        timelineByThreadId: state.timelineByThreadId,
      }),
    [selectedRun, selectedTimeline, state.timelineByThreadId],
  );

  const draft = selectedThreadId ? draftByThreadId[selectedThreadId] ?? '' : '';

  const syncPhase: ThreadSyncPhase = selectedThreadId
    ? state.syncByThreadId[selectedThreadId]?.phase ?? 'live'
    : 'live';
  const syncSendBlocked = syncPhase === 'hydrating' || syncPhase === 'resync_required';
  const sendDisabled =
    !selectedThreadId || state.flags.sending || loadingRuns || syncSendBlocked;
  const syncNotice =
    syncPhase === 'hydrating'
      ? '消息同步中，请稍候后再发送。'
      : syncPhase === 'resync_required'
        ? '正在重建消息基线，请稍候。'
        : syncPhase === 'live_degraded'
          ? '消息同步不完整，后台正在重试。'
          : '';

  const selectRun = React.useCallback(
    async (runId: string) => {
      const mappedThreadId = runProjection.runIdToThreadId[runId];
      if (!mappedThreadId) return;
      // Transitional bridge: runtime still speaks thread identity, while sidebar now selects run identity.
      await runtime.selectThread(mappedThreadId);
    },
    [runProjection.runIdToThreadId, runtime],
  );

  const onDraftChange = React.useCallback(
    (value: string) => {
      if (!selectedThreadId) return;
      setDraftByThreadId((prev) => ({
        ...prev,
        [selectedThreadId]: value,
      }));
    },
    [selectedThreadId],
  );

  const sendMessage = React.useCallback(
    async (text?: string) => {
      if (sendDisabled || !selectedThreadId) return;
      const raw = text ?? draftByThreadId[selectedThreadId] ?? '';
      const normalized = raw.trim();
      if (!normalized) return;
      await runtime.sendMessage(selectedThreadId, normalized, 'steer');
      setDraftByThreadId((prev) => ({
        ...prev,
        [selectedThreadId]: '',
      }));
    },
    [draftByThreadId, runtime, selectedThreadId, sendDisabled],
  );

  return {
    state,
    runs,
    runProjection,
    timelineMessages,
    draft,
    onDraftChange,
    sendMessage,
    sendDisabled,
    syncPhase,
    syncNotice,
    loadingRuns,
    runsError,
    reloadRuns,
    selectRun,
  };
}
