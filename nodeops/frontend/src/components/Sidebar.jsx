import React, { useState, useEffect } from 'react';
import {
  FolderOpen, FolderClosed, ChevronRight, ChevronDown,
  Plus, Users, MessageSquare, Circle, Play, Square,
  CheckCircle, Clock, AlertCircle, Minus, Terminal, RefreshCw,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }) {
  const map = {
    running:              { color: '#00d4aa', glow: '0 0 4px rgba(0,212,170,0.7)' },
    pending:              { color: '#f59e0b', glow: '0 0 4px rgba(245,158,11,0.5)' },
    monitoring:           { color: '#00d4aa', glow: '0 0 4px rgba(0,212,170,0.5)' },
    blocked:              { color: '#ff6b4a', glow: '0 0 4px rgba(255,107,74,0.5)' },
    blocked_no_account:   { color: '#ff6b4a', glow: '0 0 4px rgba(255,107,74,0.5)' },
    failed:               { color: '#ff6b4a', glow: '0 0 4px rgba(255,107,74,0.5)' },
    completed:            { color: '#6b7280', glow: 'none' },
    stopped:              { color: '#6b7280', glow: 'none' },
    canceled:             { color: '#444460', glow: 'none' },
    idle:                 { color: '#444460', glow: 'none' },
  };
  const s = map[status] || map.idle;
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: '50%',
        flexShrink: 0,
        width: size,
        height: size,
        background: s.color,
        boxShadow: s.glow,
      }}
    />
  );
}

// ─── Task status icon ─────────────────────────────────────────────────────────
function TaskStatusIcon({ status }) {
  const sz = 12;
  switch (status) {
    case 'running':
    case 'monitoring':
      return <Play size={sz} style={{ color: '#00d4aa', flexShrink: 0 }} />;
    case 'pending':
      return <Clock size={sz} style={{ color: '#f59e0b', flexShrink: 0 }} />;
    case 'blocked':
    case 'blocked_no_account':
    case 'failed':
      return <AlertCircle size={sz} style={{ color: '#ff6b4a', flexShrink: 0 }} />;
    case 'completed':
    case 'stopped':
      return <CheckCircle size={sz} style={{ color: '#6b7280', flexShrink: 0 }} />;
    case 'canceled':
      return <Minus size={sz} style={{ color: '#444460', flexShrink: 0 }} />;
    default:
      return <Circle size={sz} style={{ color: '#444460', flexShrink: 0 }} />;
  }
}

// ─── Blinking cursor ──────────────────────────────────────────────────────────
function BlinkCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      style={{
        display: 'inline-block',
        width: 2,
        height: 14,
        marginLeft: 2,
        background: '#00d4aa',
        verticalAlign: 'middle',
        opacity: on ? 1 : 0,
        transition: 'opacity 0.1s',
      }}
    />
  );
}

// ─── Session list (lazy loaded) ───────────────────────────────────────────────
function SessionList({ project, taskId, indent }) {
  const { selectedNode, setSelectedNode } = useAppStore();
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSessionHistory(project, taskId)
      .then((res) => setSessions(Array.isArray(res.data ?? res) ? (res.data ?? res) : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [project, taskId]);

  if (loading) {
    return (
      <div style={{ paddingLeft: indent, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <RefreshCw size={10} style={{ color: '#333344', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#333344', fontStyle: 'italic' }}>
          loading…
        </span>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ paddingLeft: indent + 8, padding: '2px 0 2px ' + (indent + 8) + 'px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#333344', fontStyle: 'italic' }}>
        no sessions
      </div>
    );
  }

  return (
    <>
      {sessions.map((s, i) => {
        const accountEmail = s.account || s.account_email || '';
        const sessionFile  = s.session_file || s.file || s.filename || `session-${i + 1}.md`;
        const isActive = selectedNode?.type === 'session'
          && selectedNode.project === project
          && selectedNode.taskId === taskId
          && selectedNode.sessionFile === sessionFile;

        return (
          <button
            key={i}
            onClick={() => setSelectedNode({ type: 'session', project, taskId, accountEmail, sessionFile })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingLeft: indent,
              paddingTop: 3,
              paddingBottom: 3,
              paddingRight: 8,
              textAlign: 'left',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              background: isActive ? '#222233' : 'transparent',
              color: isActive ? '#00d4aa' : '#555570',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#8888aa';
                e.currentTarget.style.background = 'rgba(26,26,37,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#555570';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <MessageSquare size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {sessionFile}
            </span>
            {s.status && (
              <span style={{
                fontSize: 10,
                color: s.status === 'running' ? '#00d4aa' : s.status === 'completed' ? '#6b7280' : '#555570',
              }}>
                {s.status}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, project, baseIndent }) {
  const { selectedNode, setSelectedNode } = useAppStore();
  const [open, setOpen] = useState(false);

  const taskId = task.id || task.task_id || task.taskId;
  const status = task.status || 'idle';
  const isActive = selectedNode?.type === 'task'
    && selectedNode.project === project
    && selectedNode.taskId === taskId;

  const indent    = baseIndent;
  const subIndent = baseIndent + 20;

  return (
    <>
      {/* Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: isActive ? '#222233' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(26,26,37,0.4)'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            flexShrink: 0,
            width: 20,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: indent,
            background: 'none',
            border: 'none',
            color: '#333344',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {open
            ? <ChevronDown size={10} style={{ color: '#555570' }} />
            : <ChevronRight size={10} style={{ color: '#333344' }} />}
        </button>

        {/* Task label */}
        <button
          onClick={() => setSelectedNode({ type: 'task', project, taskId })}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingTop: 3,
            paddingBottom: 3,
            paddingRight: 8,
            textAlign: 'left',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: isActive ? '#00d4aa' : '#777790',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            minWidth: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#aaaacc'; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#777790'; }}
        >
          <TaskStatusIcon status={status} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {taskId}
          </span>
          <StatusDot status={status} size={6} />
        </button>
      </div>

      {/* Session subtree */}
      {open && <SessionList project={project} taskId={taskId} indent={subIndent} />}
    </>
  );
}

// ─── Project row ─────────────────────────────────────────────────────────────
function ProjectRow({ project }) {
  const { selectedNode, setSelectedNode, setModal } = useAppStore();
  const { tasks, fetchTasks } = useDataStore();
  const [open, setOpen] = useState(false);

  const name     = project.name || project;
  const isActive = selectedNode?.type === 'project' && selectedNode.project === name;
  const taskList = tasks[name] || [];

  const toggle = () => {
    if (!open) fetchTasks(name);
    setOpen((v) => !v);
  };

  // Running task count badge
  const runningCount = taskList.filter((t) => t.status === 'running' || t.status === 'monitoring').length;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: isActive ? '#222233' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(26,26,37,0.4)'; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Chevron */}
        <button
          onClick={toggle}
          style={{
            flexShrink: 0,
            width: 24,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 8,
            background: 'none',
            border: 'none',
            color: '#444460',
            cursor: 'pointer',
          }}
        >
          {open
            ? <ChevronDown size={11} style={{ color: '#6666aa' }} />
            : <ChevronRight size={11} style={{ color: '#444460' }} />}
        </button>

        {/* Project name */}
        <button
          onClick={() => setSelectedNode({ type: 'project', project: name })}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 4px 4px 0',
            textAlign: 'left',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            fontWeight: 500,
            color: isActive ? '#00d4aa' : '#9999bb',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            minWidth: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#ccccee'; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#9999bb'; }}
        >
          {open
            ? <FolderOpen size={13} style={{ flexShrink: 0, color: 'rgba(0,212,170,0.6)' }} />
            : <FolderClosed size={13} style={{ flexShrink: 0, color: '#555570' }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {name}
          </span>
          {runningCount > 0 && (
            <span style={{
              fontSize: 9,
              color: '#00d4aa',
              background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.3)',
              padding: '0 4px',
              borderRadius: 2,
              flexShrink: 0,
            }}>
              {runningCount} ▶
            </span>
          )}
          {runningCount === 0 && taskList.length > 0 && (
            <span style={{ fontSize: 10, color: '#444460', flexShrink: 0 }}>
              {taskList.length}
            </span>
          )}
        </button>

        {/* Quick new-task button */}
        <button
          onClick={() => {
            setSelectedNode({ type: 'project', project: name });
            setModal('newTask');
          }}
          title="New task"
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            background: 'none',
            border: 'none',
            color: '#333344',
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.15s',
            opacity: 0,
          }}
          className="project-add-btn"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = '#00d4aa';
            e.currentTarget.style.background = 'rgba(0,212,170,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
            e.currentTarget.style.color = '#333344';
            e.currentTarget.style.background = 'none';
          }}
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Task children */}
      {open && (
        taskList.length === 0
          ? (
            <div style={{
              paddingLeft: 40,
              padding: '4px 0 4px 40px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#333344',
              fontStyle: 'italic',
            }}>
              no tasks
            </div>
          )
          : taskList.map((task, i) => (
            <TaskRow
              key={task.id || task.task_id || i}
              task={task}
              project={name}
              baseIndent={8}
            />
          ))
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
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#12121a',
        borderRight: '1px solid #222233',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid #222233',
          flexShrink: 0,
        }}
      >
        <Terminal size={14} style={{ color: '#00d4aa' }} />
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.15em',
            color: '#00d4aa',
            textTransform: 'uppercase',
          }}
        >
          NodeOps
        </span>
        <BlinkCursor />
      </div>

      {/* Project tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {projects.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#333344',
              fontStyle: 'italic',
            }}
          >
            no projects yet
          </div>
        ) : (
          projects.map((p, i) => (
            <ProjectRow key={p.name || i} project={p} />
          ))
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#222233', margin: '0 12px' }} />

      {/* Bottom actions */}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <SidebarAction icon={<Plus size={11} />} label="New Project" onClick={() => setModal('newProject')} accent />
        <SidebarAction icon={<Users size={11} />} label="Accounts" onClick={() => setModal('account')} info />
      </div>

      {/* Hover reveal style for add buttons */}
      <style>{`
        .project-row:hover .project-add-btn { opacity: 1 !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function SidebarAction({ icon, label, onClick, accent, info }) {
  const [hover, setHover] = useState(false);
  const color = hover
    ? (accent ? '#00d4aa' : info ? '#4a9eff' : '#9999bb')
    : '#666680';
  const bg = hover ? (accent ? 'rgba(0,212,170,0.08)' : info ? 'rgba(74,158,255,0.08)' : '#1a1a25') : 'transparent';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        color,
        background: bg,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
