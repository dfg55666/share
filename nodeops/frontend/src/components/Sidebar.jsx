import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, FolderClosed, ChevronRight, ChevronDown,
  Plus, Users, MessageSquare, Circle, Play, Square,
  CheckCircle, Clock, AlertCircle, Minus, Terminal,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';

// ─── Status indicator ─────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }) {
  const map = {
    running:   { color: '#00d4aa', glow: '0 0 4px rgba(0,212,170,0.7)' },
    pending:   { color: '#f59e0b', glow: '0 0 4px rgba(245,158,11,0.5)' },
    blocked:   { color: '#ff6b4a', glow: '0 0 4px rgba(255,107,74,0.5)' },
    failed:    { color: '#ff6b4a', glow: '0 0 4px rgba(255,107,74,0.5)' },
    completed: { color: '#6b7280', glow: 'none' },
    canceled:  { color: '#444460', glow: 'none' },
    idle:      { color: '#444460', glow: 'none' },
  };
  const s = map[status] || map.idle;
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: s.color, boxShadow: s.glow }}
    />
  );
}

// ─── Task status icon ─────────────────────────────────────────────────────────
function TaskStatusIcon({ status }) {
  const props = { size: 12, className: 'flex-shrink-0' };
  switch (status) {
    case 'running':   return <Play   {...props} className="text-accent flex-shrink-0" />;
    case 'pending':   return <Clock  {...props} className="text-[#f59e0b] flex-shrink-0" />;
    case 'blocked':   return <AlertCircle {...props} className="text-warn flex-shrink-0" />;
    case 'failed':    return <AlertCircle {...props} className="text-warn flex-shrink-0" />;
    case 'completed': return <CheckCircle {...props} className="text-[#6b7280] flex-shrink-0" />;
    case 'canceled':  return <Minus  {...props} className="text-[#444460] flex-shrink-0" />;
    default:          return <Circle {...props} className="text-[#444460] flex-shrink-0" />;
  }
}

// ─── Cursor blink ─────────────────────────────────────────────────────────────
function BlinkCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className="inline-block w-[2px] h-[14px] ml-0.5 bg-accent align-middle"
      style={{ opacity: on ? 1 : 0, transition: 'opacity 0.1s' }}
    />
  );
}

// ─── Session sub-tree ─────────────────────────────────────────────────────────
function SessionTree({ project, taskId, depth = 4 }) {
  const { selectedNode, setSelectedNode } = useAppStore();
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    api.getSessionHistory(project, taskId)
      .then((res) => setSessions(res.data ?? res ?? []))
      .catch(() => setSessions([]));
  }, [project, taskId]);

  if (sessions === null) {
    return (
      <div className="pl-8 py-0.5 text-[11px] font-mono text-[#333344] italic">
        loading…
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="pl-8 py-0.5 text-[11px] font-mono text-[#333344] italic">
        no sessions
      </div>
    );
  }

  return (
    <>
      {sessions.map((s, i) => {
        const accountEmail = s.account || s.account_email || '';
        const sessionFile  = s.session_file || s.file || s.filename || '';
        const isActive = selectedNode?.type === 'session'
          && selectedNode.project === project
          && selectedNode.taskId === taskId
          && selectedNode.sessionFile === sessionFile;

        return (
          <button
            key={i}
            onClick={() =>
              setSelectedNode({ type: 'session', project, taskId, accountEmail, sessionFile })
            }
            className={`
              w-full flex items-center gap-2 px-2 py-[3px] text-left
              font-mono text-[11px] transition-colors
              ${isActive
                ? 'bg-surface-3 text-accent'
                : 'text-[#555570] hover:text-[#8888aa] hover:bg-surface-2/50'}
            `}
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            <MessageSquare size={10} className="flex-shrink-0 opacity-60" />
            <span className="truncate">
              {sessionFile || `session-${i + 1}`}
            </span>
            {s.status && (
              <span
                className={`ml-auto text-[10px] ${
                  s.status === 'completed' ? 'text-[#6b7280]'
                  : s.status === 'running'  ? 'text-accent'
                  : 'text-[#555570]'
                }`}
              >
                {s.status}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

// ─── Account sub-tree within a task ──────────────────────────────────────────
function AccountTree({ account, project, taskId, depth = 3 }) {
  const [open, setOpen] = useState(false);
  const label = account.email || account;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-[3px] text-left font-mono text-[11px] text-[#444460] hover:text-[#6666aa] transition-colors"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <Users size={10} className="opacity-50 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {open && <SessionTree project={project} taskId={taskId} depth={depth + 1} />}
    </>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, project, depth = 2 }) {
  const { selectedNode, setSelectedNode } = useAppStore();
  const [open, setOpen] = useState(false);

  const taskId  = task.id || task.task_id || task.taskId;
  const status  = task.status || 'idle';
  const isActive = selectedNode?.type === 'task'
    && selectedNode.project === project
    && selectedNode.taskId  === taskId;

  // Accounts assigned to this task
  const accounts = task.accounts || task.assigned_accounts || [];

  return (
    <>
      <div
        className={`
          flex items-center group transition-colors
          ${isActive ? 'bg-surface-3' : 'hover:bg-surface-2/40'}
        `}
      >
        {/* expand toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0 flex items-center justify-center w-5 h-6 text-[#333344] hover:text-[#555570]"
          style={{ marginLeft: `${depth * 12}px` }}
        >
          {accounts.length > 0
            ? (open ? <ChevronDown size={10} /> : <ChevronRight size={10} />)
            : <span className="w-2" />}
        </button>

        {/* task label */}
        <button
          onClick={() => setSelectedNode({ type: 'task', project, taskId })}
          className={`
            flex-1 flex items-center gap-2 py-[3px] pr-2 text-left
            font-mono text-[11px] min-w-0
            ${isActive ? 'text-accent' : 'text-[#777790] hover:text-[#aaaacc]'}
          `}
        >
          <TaskStatusIcon status={status} />
          <span className="truncate">{taskId}</span>
          <StatusDot status={status} size={6} />
        </button>
      </div>

      {open && accounts.length > 0 && accounts.map((acc, i) => (
        <AccountTree
          key={i}
          account={acc}
          project={project}
          taskId={taskId}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

// ─── Project row ─────────────────────────────────────────────────────────────
function ProjectRow({ project }) {
  const { selectedNode, setSelectedNode } = useAppStore();
  const { tasks, fetchTasks } = useDataStore();
  const [open, setOpen] = useState(false);

  const name      = project.name || project;
  const isActive  = selectedNode?.type === 'project' && selectedNode.project === name;
  const taskList  = tasks[name] || [];

  const toggle = () => {
    if (!open) fetchTasks(name);
    setOpen((v) => !v);
  };

  return (
    <>
      <div
        className={`flex items-center group transition-colors ${
          isActive ? 'bg-surface-3' : 'hover:bg-surface-2/40'
        }`}
      >
        <button
          onClick={toggle}
          className="flex-shrink-0 flex items-center justify-center w-6 h-7 pl-2 text-[#444460] hover:text-[#6666aa]"
        >
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>

        <button
          onClick={() => setSelectedNode({ type: 'project', project: name })}
          className={`flex-1 flex items-center gap-2 py-1 pr-2 text-left min-w-0 font-mono text-[12px] ${
            isActive ? 'text-accent' : 'text-[#9999bb] hover:text-[#ccccee]'
          }`}
        >
          {open
            ? <FolderOpen size={13} className="flex-shrink-0 text-accent/60" />
            : <FolderClosed size={13} className="flex-shrink-0 text-[#555570]" />}
          <span className="truncate font-medium">{name}</span>
          {taskList.length > 0 && (
            <span className="ml-auto text-[10px] text-[#444460] flex-shrink-0">
              {taskList.length}
            </span>
          )}
        </button>
      </div>

      {open && (
        <>
          {taskList.length === 0 ? (
            <div className="pl-10 py-1 text-[11px] font-mono text-[#333344] italic">
              no tasks
            </div>
          ) : (
            taskList.map((task, i) => (
              <TaskRow key={task.id || task.task_id || i} task={task} project={name} />
            ))
          )}
        </>
      )}
    </>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { setModal } = useAppStore();
  const { projects } = useDataStore();

  return (
    <div
      className="flex flex-col bg-surface-1 border-r border-surface-3 flex-shrink-0 overflow-hidden"
      style={{ width: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-3 flex-shrink-0">
        <Terminal size={14} className="text-accent" />
        <span className="font-mono font-bold text-sm tracking-widest text-accent uppercase">
          NodeOps
        </span>
        <BlinkCursor />
      </div>

      {/* Project tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="font-mono text-[11px] text-[#333344] italic">no projects yet</p>
          </div>
        ) : (
          projects.map((p, i) => (
            <ProjectRow key={p.name || i} project={p} />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-surface-3 mx-3" />

      {/* Bottom actions */}
      <div className="px-3 py-2 flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={() => setModal('newProject')}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left font-mono text-[11px] text-[#666680] hover:text-accent hover:bg-surface-2 transition-colors"
        >
          <Plus size={11} />
          <span>New Project</span>
        </button>
        <button
          onClick={() => setModal('account')}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left font-mono text-[11px] text-[#666680] hover:text-info hover:bg-surface-2 transition-colors"
        >
          <Users size={11} />
          <span>Accounts</span>
        </button>
      </div>
    </div>
  );
}
