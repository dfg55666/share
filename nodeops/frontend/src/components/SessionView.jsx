import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, MessageSquare, User, Bot, Activity } from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';
import { showToast } from './Toast';

// ─── Parse message content ────────────────────────────────────────────────────
// Splits a raw session file string into typed message segments
function parseSessionContent(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.split('\n');
  const segments = [];
  let current = null;

  const flush = () => {
    if (current) {
      current.text = current.lines.join('\n').trim();
      if (current.text) segments.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (/^\[User\]/i.test(line)) {
      flush();
      current = { role: 'user',      lines: [line.replace(/^\[User\]\s*/i, '').trim()], raw: line };
    } else if (/^\[Assistant\]/i.test(line)) {
      flush();
      current = { role: 'assistant', lines: [line.replace(/^\[Assistant\]\s*/i, '').trim()], raw: line };
    } else if (/^---/.test(line)) {
      flush();
      segments.push({ role: 'divider', text: line });
    } else if (/^#+\s/.test(line)) {
      flush();
      segments.push({ role: 'meta', text: line.replace(/^#+\s/, '') });
    } else {
      if (current) {
        current.lines.push(line);
      } else {
        segments.push({ role: 'system', text: line });
      }
    }
  }
  flush();
  return segments.filter((s) => s.text || s.role === 'divider');
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ segment }) {
  const { role, text } = segment;

  if (role === 'divider') {
    return <div className="h-px bg-surface-3 my-4 mx-4" />;
  }

  if (role === 'meta') {
    return (
      <div className="px-4 py-1">
        <span className="font-mono text-[10px] text-[#444460] uppercase tracking-widest">{text}</span>
      </div>
    );
  }

  if (role === 'system') {
    if (!text.trim()) return null;
    return (
      <div className="px-4 py-0.5">
        <p className="font-mono text-[11px] text-[#444460] italic leading-relaxed">{text}</p>
      </div>
    );
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end px-4 py-1 animate-fade-in">
        <div className="flex items-start gap-2 max-w-[75%]">
          <div className="bg-accent/10 border border-accent/20 px-3 py-2 text-right">
            <p className="font-mono text-[11px] text-[#cceeee] whitespace-pre-wrap leading-relaxed">
              {text}
            </p>
          </div>
          <div className="flex-shrink-0 w-6 h-6 bg-accent/20 flex items-center justify-center mt-0.5">
            <User size={11} className="text-accent" />
          </div>
        </div>
      </div>
    );
  }

  if (role === 'assistant') {
    return (
      <div className="flex justify-start px-4 py-1 animate-fade-in">
        <div className="flex items-start gap-2 max-w-[80%]">
          <div className="flex-shrink-0 w-6 h-6 bg-surface-3 flex items-center justify-center mt-0.5">
            <Bot size={11} className="text-info" />
          </div>
          <div className="bg-surface-3 border border-surface-4 px-3 py-2">
            <p className="font-mono text-[11px] text-[#bbbbdd] whitespace-pre-wrap leading-relaxed">
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Live message stream ──────────────────────────────────────────────────────
function LiveMessages({ project, taskId }) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load cached messages first
    api.getTaskMessages(project, taskId)
      .then((res) => {
        const msgs = res.data ?? res ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // SSE stream for live updates
    const es = api.createTaskEventSource(project, taskId);
    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, data]);
      } catch (_) {}
    });
    es.addEventListener('status', (e) => {
      // status changes — we just note them
    });
    es.onerror = () => {};
    return () => es.close();
  }, [project, taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 font-mono text-[11px] text-accent/60">
        <RefreshCw size={11} className="animate-spin" /> loading live messages…
      </div>
    );
  }

  return (
    <div className="border-t border-surface-3 mt-2">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-3">
        <Activity size={11} className="text-accent" />
        <span className="font-mono text-[10px] text-accent uppercase tracking-widest">live stream</span>
        <span className="font-mono text-[10px] text-[#444460] ml-auto">{messages.length} events</span>
      </div>
      <div className="flex flex-col gap-1 py-2">
        {messages.length === 0 && (
          <p className="px-4 font-mono text-[11px] text-[#333344] italic">no live events yet</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="px-4 py-1">
            <div className={`
              font-mono text-[11px] leading-relaxed px-2 py-1.5
              ${msg.role === 'user'      ? 'bg-accent/10 border-l-2 border-accent text-[#cceeee]'
              : msg.role === 'assistant' ? 'bg-surface-3 border-l-2 border-info text-[#bbbbdd]'
              :                           'bg-surface-2 border-l border-surface-4 text-[#666680]'}
            `}>
              {msg.role && (
                <span className="text-[9px] uppercase tracking-widest opacity-50 block mb-0.5">
                  {msg.role}
                </span>
              )}
              {msg.content || msg.message || msg.text || JSON.stringify(msg)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Main SessionView ─────────────────────────────────────────────────────────
export default function SessionView() {
  const { selectedNode } = useAppStore();
  const { tasks } = useDataStore();
  const [rawContent, setRawContent] = useState(null);
  const [loading, setLoading]       = useState(false);
  const bottomRef = useRef(null);

  const { project, taskId, accountEmail, sessionFile } = selectedNode || {};

  // Find task to check if it's live
  const taskList = tasks[project] || [];
  const task = taskList.find((t) => (t.id || t.task_id || t.taskId) === taskId);
  const isLive = task?.status === 'running';

  const loadContent = useCallback(async () => {
    if (!project || !taskId || !sessionFile) return;
    try {
      setLoading(true);
      const res = await api.getSessionContent(project, taskId, accountEmail || '', sessionFile);
      setRawContent(res.data ?? res.content ?? res ?? '');
    } catch (e) {
      showToast(`Failed to load session: ${e.message}`, 'error');
      setRawContent('');
    } finally {
      setLoading(false);
    }
  }, [project, taskId, accountEmail, sessionFile]);

  useEffect(() => {
    setRawContent(null);
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawContent]);

  const segments = rawContent ? parseSessionContent(rawContent) : [];

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-surface-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-accent/60 flex-shrink-0" />
              <h1 className="font-mono font-bold text-sm text-[#ddddee] truncate">
                {sessionFile || 'session'}
              </h1>
              {isLive && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" style={{ boxShadow: '0 0 4px rgba(0,212,170,0.7)' }} />
                  live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {accountEmail && (
                <span className="font-mono text-[11px] text-[#555570]">
                  {accountEmail}
                </span>
              )}
              <span className="font-mono text-[11px] text-[#444460]">
                {project} / {taskId}
              </span>
            </div>
          </div>

          <button
            onClick={loadContent}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-4 text-[#555570] hover:text-[#9999bb] hover:bg-surface-2 transition-colors font-mono text-[11px] disabled:opacity-40"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2 font-mono text-[11px] text-accent/60">
            <RefreshCw size={12} className="animate-spin" /> loading session…
          </div>
        ) : segments.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="font-mono text-[12px] text-[#333344] italic">
              {sessionFile ? 'Empty session' : 'No session selected'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {segments.map((seg, i) => (
              <MessageBubble key={i} segment={seg} />
            ))}
          </div>
        )}

        {/* Live stream if task is running */}
        {isLive && project && taskId && (
          <LiveMessages project={project} taskId={taskId} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
