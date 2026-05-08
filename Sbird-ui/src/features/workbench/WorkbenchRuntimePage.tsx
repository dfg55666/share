import React from 'react';
import { ChatComposerPanel, ChatHeader, ChatTimeline } from '../chat';
import { RightPanel } from '../panel';
import { WorkbenchShell } from '../session';
import { SettingsPanel } from '../settings';
import {
  WorkbenchSidebar,
  type NavItem,
  type Subject,
  type UserInfo,
} from '../threads';
import { useWorkbenchRuntime } from './model/useWorkbenchRuntime';

const NAV_TEMPLATE: Array<Omit<NavItem, 'active'>> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'agents', label: 'Agents', icon: 'bot' },
  { id: 'workflows', label: 'Workflows', icon: 'workflow' },
  { id: 'knowledge', label: '知识库（待接入）', icon: 'book-open', disabled: true },
];

const EMPTY_SUBJECTS: Subject[] = [];

const USER_INFO: UserInfo = {
  name: 'Sbird Runtime',
  role: '已连接 Engine',
};

const WORKFLOW_LABEL_BY_KEY: Record<string, string> = {
  yinzhan: '印占',
  liuyao: '六爻',
};

function workflowLabel(workflowKey: string): string {
  const normalized = workflowKey.trim();
  return WORKFLOW_LABEL_BY_KEY[normalized] ?? (normalized || '其他');
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function WorkbenchRuntimePage() {
  const bridge = useWorkbenchRuntime();
  const [activeNav, setActiveNav] = React.useState('home');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const navItems = React.useMemo(
    () =>
      NAV_TEMPLATE.map((item) => ({
        ...item,
        active: item.id === activeNav,
      })),
    [activeNav],
  );

  const selectedRunId = bridge.runProjection.selectedRunId;
  const selectedRun = selectedRunId
    ? bridge.runProjection.runById[selectedRunId]
    : undefined;

  const selectedThread = bridge.state.threads.find(
    (thread) => thread.id === bridge.state.selectedThreadId,
  );

  const agentChips = React.useMemo(() => {
    if (!selectedRun) return [];
    const sessions = selectedRun.agentSessions?.agents ?? {};
    return Object.entries(sessions).map(([agentId, session]) => ({
      id: agentId,
      name: session.threadName?.trim() || agentId,
    }));
  }, [selectedRun]);

  const runtimeError = bridge.runsError || bridge.state.error;
  const runtimeWarning = bridge.syncNotice || bridge.state.warning;

  const timelineMessages = React.useMemo(() => {
    const runtimeBadge = {
      role: 'agent' as const,
      senderName: 'Runtime',
      senderTag: 'System',
      time: nowTimeLabel(),
    };

    if (bridge.loadingRuns || bridge.state.flags.loadingThreads) {
      return [
        {
          ...runtimeBadge,
          id: 'runtime-loading',
          content: '正在同步运行列表，请稍候…',
        },
      ];
    }

    if (!selectedRun) {
      return [
        {
          ...runtimeBadge,
          id: 'runtime-empty',
          content: '请选择左侧运行记录，然后即可查看真实聊天时间线。',
        },
      ];
    }

    if (!bridge.state.selectedThreadId) {
      return [
        {
          ...runtimeBadge,
          id: `runtime-missing-thread-${selectedRun.runId}`,
          content: `运行 ${selectedRun.runId} 尚未映射到可用线程，请稍后重试。`,
        },
      ];
    }

    if (bridge.state.flags.loadingSnapshot && bridge.timelineMessages.length === 0) {
      return [
        {
          ...runtimeBadge,
          id: `runtime-loading-snapshot-${selectedRun.runId}`,
          content: `正在加载运行 ${selectedRun.runId} 的时间线…`,
        },
      ];
    }

    const messages =
      bridge.timelineMessages.length > 0
        ? bridge.timelineMessages
        : [
            {
              ...runtimeBadge,
              id: `runtime-no-messages-${selectedRun.runId}`,
              content: '该运行暂未产生可展示消息，可在下方输入框发送新消息。',
            },
          ];

    if (runtimeError) {
      return [
        {
          ...runtimeBadge,
          id: 'runtime-error',
          content: runtimeError,
        },
        ...messages,
      ];
    }

    if (runtimeWarning) {
      return [
        {
          ...runtimeBadge,
          id: 'runtime-warning',
          content: runtimeWarning,
        },
        ...messages,
      ];
    }

    return messages;
  }, [
    bridge.loadingRuns,
    bridge.state.flags.loadingThreads,
    bridge.state.flags.loadingSnapshot,
    bridge.state.selectedThreadId,
    bridge.timelineMessages,
    runtimeError,
    runtimeWarning,
    selectedRun,
  ]);

  const composerDisabled = !selectedRun;
  const composerPlaceholder = !selectedRun
    ? '先在左侧选择运行记录。'
    : bridge.state.flags.sending
      ? '消息发送中…'
      : bridge.syncNotice || '向当前运行发送消息';

  const filteredGroups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bridge.runProjection.groups;
    return bridge.runProjection.groups
      .map((group) => ({
        ...group,
        threads: group.threads.filter((t) => t.title.toLowerCase().includes(q)),
      }))
      .filter((group) => group.threads.length > 0);
  }, [bridge.runProjection.groups, searchQuery]);

  return (
    <>
    <WorkbenchShell
      sidebarCollapsed={sidebarCollapsed}
      sidebar={
        <WorkbenchSidebar
          navItems={navItems}
          threadGroups={filteredGroups}
          subjects={EMPTY_SUBJECTS}
          user={USER_INFO}
          collapsed={sidebarCollapsed}
          onNavSelect={setActiveNav}
          onThreadSelect={(runId) => {
            void bridge.selectRun(runId);
          }}
          onCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onSearch={setSearchQuery}
          onSubjectAdd={() => {}}
          onSettingsClick={() => setSettingsOpen(true)}
          subjectActionsDisabled
          contactDisabled
        />
      }
      chat={
        <>
          <ChatHeader
            title={
              selectedRun
                ? `${workflowLabel(selectedRun.workflowKey)} · ${selectedRun.runId}`
                : '选择左侧运行记录'
            }
            sessionId={selectedThread ? `线程 ID: ${selectedThread.id}` : undefined}
            agents={agentChips}
          />
          <ChatTimeline messages={timelineMessages} />
          <ChatComposerPanel
            value={bridge.draft}
            onChange={bridge.onDraftChange}
            onSend={(text) => {
              void bridge.sendMessage(text);
            }}
            disabled={composerDisabled}
            sendDisabled={bridge.sendDisabled}
            placeholder={composerPlaceholder}
          />
        </>
      }
      panel={<RightPanel onExport={() => {}} onGenerateReport={() => {}} />}
    />
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
