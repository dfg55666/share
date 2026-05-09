import React, { useEffect } from 'react';
import {
  GitBranch, Plus, ExternalLink, Layers, Clock,
  Play, CheckCircle, AlertCircle, Minus, Circle,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';

function statusColor(status) {
  switch (status) {
    case 'running':   return 'text-accent border-accent/30 bg-accent/10';
    case 'pending':   return 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10';
    case 'failed':
    case 'blocked':   return 'text-warn border-warn/30 bg-warn/10';
    case 'completed': return 'text-[#6b7280] border-[#6b7280]/30 bg-[#6b7280]/10';
    case 'canceled':  return 'text-[#444460] border-[#444460]/30 bg-[#444460]/10';
    default:          return 'text-[#555570] border-[#555570]/20 bg-transparent';
  }
}

function StatusIcon({ status }) {
  const cls = 'flex-shrink-0';
  switch (status) {
    case 'running':   return <Play          size={11} className={`${cls} text-accent`} />;
    case 'pending':   return <Clock         size={11} className={`${cls} text-[#f59e0b]`} />;
    case 'failed':
    case 'blocked':   return <AlertCircle  size={11} className={`${cls} text-warn`} />;
    case 'completed': return <CheckCircle  size={11} className={`${cls} text-[#6b7280]`} />;
    case 'canceled':  return <Minus        size={11} className={`${cls} text-[#444460]`} />;
    default:          return <Circle       size={11} className={`${cls} text-[#444460]`} />;
  }
}

export default function ProjectView() {
  const { selectedNode, setModal } = useAppStore();
  const { projects, tasks, fetchTasks } = useDataStore();

  const projectName = selectedNode?.project;
  const project = projects.find((p) => (p.name || p) === projectName) || { name: projectName };
  const taskList = tasks[projectName] || [];

  useEffect(() => {
    if (projectName) fetchTasks(projectName);
  }, [projectName, fetchTasks]);

  const runningCount  = taskList.filter((t) => t.status === 'running').length;
  const pendingCount  = taskList.filter((t) => t.status === 'pending').length;
  const failedCount   = taskList.filter((t) => t.status === 'failed' || t.status === 'blocked').length;

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Project header */}
      <div className="px-6 pt-5 pb-4 border-b border-surface-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-surface-3 flex items-center justify-center">
              <Layers size={15} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="font-mono font-bold text-base text-[#ddddee] tracking-tight truncate">
                {project.name}
              </h1>
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-0.5 font-mono text-[11px] text-info/70 hover:text-info transition-colors"
                >
                  <GitBranch size={10} />
                  <span className="truncate">{project.github_url}</span>
                  <ExternalLink size={9} className="flex-shrink-0" />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={() => setModal('newTask')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors font-mono text-[11px]"
          >
            <Plus size={11} />
            New Task
          </button>
        </div>

        {project.description && (
          <p className="mt-3 text-[12px] text-[#666680] leading-relaxed max-w-2xl">
            {project.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3">
          <Stat label="tasks"   value={taskList.length}  />
          {runningCount > 0 && <Stat label="running"  value={runningCount}  accent />}
          {pendingCount > 0 && <Stat label="pending"  value={pendingCount}  warn />}
          {failedCount  > 0 && <Stat label="failed"   value={failedCount}   danger />}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {taskList.length === 0 ? (
          <Empty>
            No tasks yet.{' '}
            <button
              onClick={() => setModal('newTask')}
              className="text-accent hover:underline"
            >
              Create one
            </button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-px">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] text-[#444460] uppercase tracking-widest">
                tasks
              </span>
              <div className="flex-1 h-px bg-surface-3" />
            </div>
            {taskList.map((task, i) => (
              <TaskRow key={task.id || task.task_id || i} task={task} projectName={projectName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, projectName }) {
  const { setSelectedNode } = useAppStore();
  const taskId = task.id || task.task_id || task.taskId;
  const status = task.status || 'idle';
  const mode   = task.mode || '—';
  const loops  = task.current_loop ?? task.loop_count ?? 0;
  const maxL   = task.max_loops ?? '∞';

  return (
    <button
      onClick={() => setSelectedNode({ type: 'task', project: projectName, taskId })}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-surface-2 hover:bg-surface-3 border border-transparent hover:border-surface-4 transition-all group"
    >
      <StatusIcon status={status} />

      <span className="font-mono text-[12px] text-[#aaaacc] group-hover:text-[#ccccee] transition-colors flex-1 min-w-0 truncate">
        {taskId}
      </span>

      <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${statusColor(status)}`}>
        {status}
      </span>

      <span className="font-mono text-[10px] text-[#444460]">
        {mode}
      </span>

      <span className="font-mono text-[10px] text-[#444460]">
        {loops}/{maxL}
      </span>

      <ChevronRight />
    </button>
  );
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#333344] group-hover:text-[#555570] flex-shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function Stat({ label, value, accent, warn, danger }) {
  const cls = accent ? 'text-accent' : warn ? 'text-[#f59e0b]' : danger ? 'text-warn' : 'text-[#ccccee]';
  return (
    <div className="flex items-baseline gap-1">
      <span className={`font-mono text-sm font-semibold ${cls}`}>{value}</span>
      <span className="font-mono text-[10px] text-[#444460]">{label}</span>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="flex items-center justify-center h-40">
      <p className="font-mono text-[12px] text-[#333344] italic">{children}</p>
    </div>
  );
}
