import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Square, Trash2, RefreshCw, FileText,
  ChevronRight, ChevronDown, Folder, File,
  AlertCircle, CheckCircle, Clock, Minus,
  BarChart2, MessageSquare,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';
import { showToast } from './Toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(status) {
  switch (status) {
    case 'running':   return { text: 'text-accent',    border: 'border-accent/30',    bg: 'bg-accent/10' };
    case 'pending':   return { text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30', bg: 'bg-[#f59e0b]/10' };
    case 'failed':
    case 'blocked':   return { text: 'text-warn',      border: 'border-warn/30',      bg: 'bg-warn/10' };
    case 'completed': return { text: 'text-[#6b7280]', border: 'border-[#6b7280]/30', bg: 'bg-[#6b7280]/10' };
    case 'canceled':  return { text: 'text-[#444460]', border: 'border-[#444460]/30', bg: 'bg-[#444460]/10' };
    default:          return { text: 'text-[#666680]', border: 'border-surface-4',    bg: 'bg-transparent' };
  }
}

function StatusBadge({ status }) {
  const c = statusColor(status);
  return (
    <span className={`font-mono text-[11px] px-2 py-0.5 border ${c.text} ${c.border} ${c.bg}`}>
      {status || 'idle'}
    </span>
  );
}

// ─── File tree node ───────────────────────────────────────────────────────────
function FileNode({ node, accountId, depth = 0 }) {
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDir  = node.type === 'directory' || node.is_dir || Array.isArray(node.children);
  const indent = depth * 16 + 8;

  const handleClick = async () => {
    if (isDir) { setOpen((v) => !v); return; }
    if (content !== null) { setContent(null); return; } // toggle close
    try {
      setLoading(true);
      const res = await api.getFileContent(accountId, node.path || node.name);
      setContent(res.data ?? res.content ?? res ?? '');
    } catch (e) {
      showToast(`Failed to load file: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1.5 py-[3px] text-left hover:bg-surface-3 transition-colors text-[11px] font-mono"
        style={{ paddingLeft: indent }}
      >
        {isDir
          ? open
            ? <ChevronDown size={10} className="text-[#555570]" />
            : <ChevronRight size={10} className="text-[#555570]" />
          : <span className="w-2.5 flex-shrink-0" />
        }
        {isDir
          ? <Folder size={11} className="text-accent/50 flex-shrink-0" />
          : <File   size={11} className="text-[#555570] flex-shrink-0" />
        }
        <span className={isDir ? 'text-[#8888aa]' : 'text-[#666680] hover:text-[#aaaacc]'}>
          {node.name}
        </span>
        {loading && <RefreshCw size={9} className="ml-auto text-accent animate-spin" />}
      </button>

      {/* File content inline */}
      {content !== null && !isDir && (
        <div
          className="mx-2 mb-1 border border-surface-3 bg-surface-0 overflow-auto"
          style={{ maxHeight: '300px' }}
        >
          <pre className="p-3 font-mono text-[10px] text-[#9999bb] whitespace-pre-wrap leading-relaxed">
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

      {/* Children */}
      {isDir && open && (
        <>
          {(node.children || []).map((child, i) => (
            <FileNode key={i} node={child} accountId={accountId} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────
function FilesTab({ project, taskId, task }) {
  const [tree, setTree]       = useState(null);
  const [loading, setLoading] = useState(false);

  // Pick first account from task
  const accountId = task?.accounts?.[0]?.id
    || task?.accounts?.[0]
    || task?.assigned_accounts?.[0]?.id
    || task?.assigned_accounts?.[0]
    || null;

  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getTaskFileTree(project, taskId);
      const nodes = res.data ?? res.tree ?? res ?? [];
      setTree(Array.isArray(nodes) ? nodes : []);
    } catch (e) {
      showToast(`Failed to load file tree: ${e.message}`, 'error');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [project, taskId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 text-accent/60 font-mono text-[11px]">
        <RefreshCw size={12} className="animate-spin" /> loading workspace…
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="px-4 py-8 text-center font-mono text-[11px] text-[#333344] italic">
        No files found in workspace.
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 mb-2">
        <span className="font-mono text-[10px] text-[#444460] uppercase tracking-widest">
          workspace
        </span>
        <button
          onClick={loadTree}
          className="ml-auto text-[#444460] hover:text-accent transition-colors"
        >
          <RefreshCw size={11} />
        </button>
      </div>
      {tree.map((node, i) => (
        <FileNode key={i} node={node} accountId={accountId} />
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ task, project, taskId, onRefresh }) {
  const { startTask, cancelTask, deleteTask } = useDataStore();
  const { setSelectedNode } = useAppStore();
  const [busy, setBusy] = useState(false);

  const status   = task.status || 'idle';
  const mode     = task.mode || '—';
  const loops    = task.current_loop ?? task.loop_count ?? 0;
  const maxL     = task.max_loops ?? '∞';
  const message  = task.message || task.prompt || '';
  const progress = task.progress || task.completed_loops || task.loop_results || [];
  const c        = statusColor(status);

  const act = async (fn, label) => {
    try {
      setBusy(true);
      await fn();
      onRefresh();
    } catch (e) {
      showToast(`${label} failed: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${taskId}"?`)) return;
    try {
      setBusy(true);
      await deleteTask(project, taskId);
      setSelectedNode({ type: 'project', project });
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-4 px-6">
      {/* Status + meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={status} />

        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-[#444460]">mode:</span>
          <span className="text-[#9999bb]">{mode}</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-[#444460]">loops:</span>
          <span className="text-[#9999bb]">{loops}<span className="text-[#444460]">/{maxL}</span></span>
        </div>

        {task.created_at && (
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-[#444460]">created:</span>
            <span className="text-[#666680]">{new Date(task.created_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {(status === 'pending' || status === 'idle') && (
          <ActionButton
            icon={<Play size={12} />}
            label="Start"
            accent
            disabled={busy}
            onClick={() => act(() => startTask(project, taskId), 'Start')}
          />
        )}
        {status === 'running' && (
          <ActionButton
            icon={<Square size={12} />}
            label="Cancel"
            warn
            disabled={busy}
            onClick={() => act(() => cancelTask(project, taskId), 'Cancel')}
          />
        )}
        <ActionButton
          icon={<Trash2 size={12} />}
          label="Delete"
          danger
          disabled={busy}
          onClick={handleDelete}
        />
        <ActionButton
          icon={<RefreshCw size={12} className={busy ? 'animate-spin' : ''} />}
          label="Refresh"
          disabled={busy}
          onClick={onRefresh}
        />
      </div>

      {/* Message */}
      {message && (
        <div>
          <SectionLabel>prompt / message</SectionLabel>
          <div className="mt-1.5 bg-surface-0 border border-surface-3 p-3">
            <pre className="font-mono text-[11px] text-[#9999bb] whitespace-pre-wrap leading-relaxed">
              {message}
            </pre>
          </div>
        </div>
      )}

      {/* Accounts */}
      {(task.accounts?.length > 0 || task.assigned_accounts?.length > 0) && (
        <div>
          <SectionLabel>assigned accounts</SectionLabel>
          <div className="mt-1.5 flex flex-col gap-1">
            {(task.accounts || task.assigned_accounts || []).map((acc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-surface-3 font-mono text-[11px]"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: acc.status === 'available' ? '#00d4aa'
                              : acc.status === 'exhausted' ? '#f59e0b'
                              : '#444460',
                  }}
                />
                <span className="text-[#aaaacc]">{acc.email || acc}</span>
                {acc.status && (
                  <span className="ml-auto text-[#555570]">{acc.status}</span>
                )}
                {acc.credits !== undefined && (
                  <span className="text-[#666680]">{acc.credits} cr</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress / completed loops */}
      {progress.length > 0 && (
        <div>
          <SectionLabel>loop history</SectionLabel>
          <div className="mt-1.5 flex flex-col gap-1">
            {progress.map((loop, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 bg-surface-2 border border-surface-3 font-mono text-[11px]"
              >
                <span className="text-[#444460] w-5 text-right">{i + 1}</span>
                <span className="text-[#666680]">{loop.account || loop.account_email || '—'}</span>
                <span className={`ml-auto ${
                  loop.end_reason === 'completed' ? 'text-[#6b7280]'
                  : loop.end_reason === 'error'   ? 'text-warn'
                  : 'text-[#555570]'
                }`}>
                  {loop.end_reason || loop.status || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, accent, warn, danger, disabled, onClick }) {
  const color = accent ? 'text-accent border-accent/30 hover:bg-accent/10'
              : warn   ? 'text-warn   border-warn/30   hover:bg-warn/10'
              : danger ? 'text-warn   border-warn/30   hover:bg-warn/10 opacity-70'
              : 'text-[#666680] border-surface-4 hover:bg-surface-3 hover:text-[#9999bb]';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-[#444460] uppercase tracking-widest">
        {children}
      </span>
      <div className="flex-1 h-px bg-surface-3" />
    </div>
  );
}

// ─── Main TaskView ────────────────────────────────────────────────────────────
export default function TaskView() {
  const { selectedNode } = useAppStore();
  const { tasks, fetchTasks } = useDataStore();
  const [activeTab, setActiveTab] = useState('overview');

  const { project, taskId } = selectedNode || {};
  const taskList = tasks[project] || [];
  const task = taskList.find((t) => (t.id || t.task_id || t.taskId) === taskId);

  const refresh = useCallback(() => {
    if (project) fetchTasks(project);
  }, [project, fetchTasks]);

  useEffect(() => {
    refresh();
  }, [project, taskId]);

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-[12px] text-[#333344] italic">
          {taskId ? 'Loading task…' : 'No task selected'}
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={12} /> },
    { id: 'files',    label: 'Files',    icon: <FileText  size={12} /> },
  ];

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-surface-3 flex-shrink-0">
        <div className="flex items-baseline gap-3 mb-3">
          <h1 className="font-mono font-bold text-sm text-[#ddddee] tracking-tight">
            {taskId}
          </h1>
          <span className="font-mono text-[11px] text-[#444460]">in {project}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-[#555570] hover:text-[#9999bb]'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <OverviewTab task={task} project={project} taskId={taskId} onRefresh={refresh} />
        )}
        {activeTab === 'files' && (
          <FilesTab task={task} project={project} taskId={taskId} />
        )}
      </div>
    </div>
  );
}
