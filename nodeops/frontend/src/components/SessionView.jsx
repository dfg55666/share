import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, MessageSquare, User, Bot, Activity,
  ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';
import { showToast } from './Toast';

// ─── Parse raw session .md content into segments ──────────────────────────────
// Handles both our own markdown format AND raw SSE JSON lines
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
    const trimmed = line.trim();

    // Try to parse as JSON (raw SSE data lines)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        flush();
        // Detect message type from JSON
        if (obj.type === 'text' || obj.content || obj.message || obj.text) {
          const role = obj.role || (obj.type === 'user' ? 'user' : 'assistant');
          const text = obj.content || obj.message || obj.text || JSON.stringify(obj, null, 2);
          segments.push({ role, text });
        } else if (obj.event || obj.status || obj.type) {
          // System/meta event
          segments.push({
            role: 'system',
            text: obj.event
              ? `[${obj.event}] ${obj.data ? JSON.stringify(obj.data) : ''}`
              : `[${obj.type || obj.status}]`,
          });
        } else {
          segments.push({ role: 'system', text: trimmed });
        }
        continue;
      } catch (_) { /* not JSON, fall through */ }
    }

    // Markdown format
    if (/^\[User\]/i.test(line)) {
      flush();
      current = { role: 'user', lines: [line.replace(/^\[User\]\s*/i, '').trim()] };
    } else if (/^\[Assistant\]/i.test(line)) {
      flush();
      current = { role: 'assistant', lines: [line.replace(/^\[Assistant\]\s*/i, '').trim()] };
    } else if (/^\[System\]/i.test(line)) {
      flush();
      segments.push({ role: 'system', text: line.replace(/^\[System\]\s*/i, '').trim() });
    } else if (/^---+$/.test(trimmed)) {
      flush();
      segments.push({ role: 'divider', text: '---' });
    } else if (/^#{1,3}\s/.test(line)) {
      flush();
      segments.push({ role: 'meta', text: line.replace(/^#+\s/, '') });
    } else if (trimmed === '') {
      if (current) current.lines.push('');
    } else {
      if (current) {
        current.lines.push(line);
      } else if (trimmed) {
        // Orphan line — treat as system
        segments.push({ role: 'system', text: trimmed });
      }
    }
  }
  flush();
  return segments.filter((s) => s.role === 'divider' || (s.text && s.text.trim()));
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ segment }) {
  const { role, text } = segment;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (role === 'divider') {
    return <div style={{ height: 1, background: '#222233', margin: '12px 16px' }} />;
  }

  if (role === 'meta') {
    return (
      <div style={{ padding: '4px 16px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#444460',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {text}
        </span>
      </div>
    );
  }

  if (role === 'system') {
    if (!text || !text.trim()) return null;
    return (
      <div style={{ padding: '2px 16px' }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#444460',
          fontStyle: 'italic',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {text}
        </p>
      </div>
    );
  }

  const isUser = role === 'user';
  const isLong = text.length > 800;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      padding: '4px 16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        maxWidth: isUser ? '75%' : '82%',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        {/* Avatar */}
        <div style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          background: isUser ? 'rgba(0,212,170,0.15)' : '#222233',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
          {isUser
            ? <User size={12} style={{ color: '#00d4aa' }} />
            : <Bot  size={12} style={{ color: '#4a9eff' }} />}
        </div>

        {/* Bubble */}
        <div style={{
          background: isUser ? 'rgba(0,212,170,0.08)' : '#1a1a25',
          border: `1px solid ${isUser ? 'rgba(0,212,170,0.2)' : '#222233'}`,
          padding: '8px 12px',
          position: 'relative',
          minWidth: 60,
        }}>
          {/* Actions */}
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            display: 'flex',
            gap: 2,
          }}>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? 'Collapse' : 'Expand'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#555570',
                  cursor: 'pointer',
                  padding: '1px 3px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
            <button
              onClick={handleCopy}
              title="Copy"
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#00d4aa' : '#555570',
                cursor: 'pointer',
                padding: '1px 3px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
          </div>

          <pre style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: isUser ? '#cceeee' : '#bbbbdd',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            margin: 0,
            paddingRight: isLong ? 30 : 20,
            maxHeight: (!isLong || expanded) ? 'none' : 120,
            overflow: (!isLong || expanded) ? 'visible' : 'hidden',
          }}>
            {text}
          </pre>

          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                marginTop: 4,
                background: 'none',
                border: 'none',
                color: '#555570',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              show more…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live SSE message stream ──────────────────────────────────────────────────
function LiveMessages({ project, taskId }) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    // Load cached messages
    api.getTaskMessages(project, taskId)
      .then((res) => {
        const msgs = res.data ?? res ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // SSE stream
    const es = api.createTaskEventSource(project, taskId);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, data]);
      } catch (_) {
        // Raw string
        if (e.data) setMessages((prev) => [...prev, { role: 'system', text: e.data }]);
      }
    });

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [
          ...prev,
          { role: 'system', text: `[status] ${data.status || JSON.stringify(data)}` },
        ]);
      } catch (_) {}
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, [project, taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,212,170,0.6)' }}>
        <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
        loading live messages…
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid #222233', marginTop: 8 }}>
      {/* Live header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid #222233',
      }}>
        <Activity size={11} style={{ color: '#00d4aa' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          live stream
        </span>
        {connected && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00d4aa',
            boxShadow: '0 0 4px rgba(0,212,170,0.6)',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
        )}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#444460', marginLeft: 'auto' }}>
          {messages.length} events
        </span>
      </div>

      {/* Events */}
      <div style={{ padding: '4px 0' }}>
        {messages.length === 0 && (
          <p style={{ padding: '8px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#333344', fontStyle: 'italic' }}>
            no live events yet
          </p>
        )}
        {messages.map((msg, i) => {
          const role = msg.role || msg.type || 'system';
          const text = msg.content || msg.message || msg.text || JSON.stringify(msg);
          const isUser      = role === 'user';
          const isAssistant = role === 'assistant';

          return (
            <div key={i} style={{ padding: '2px 16px' }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                lineHeight: 1.5,
                padding: '6px 10px',
                background: isUser ? 'rgba(0,212,170,0.08)'
                  : isAssistant ? '#1a1a25'
                  : 'rgba(26,26,37,0.5)',
                borderLeft: `2px solid ${isUser ? '#00d4aa' : isAssistant ? '#4a9eff' : '#2a2a3d'}`,
                color: isUser ? '#cceeee' : isAssistant ? '#bbbbdd' : '#555570',
              }}>
                {role && (
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, display: 'block', marginBottom: 2 }}>
                    {role}
                  </span>
                )}
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</pre>
              </div>
            </div>
          );
        })}
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
  const [loading,    setLoading]    = useState(false);
  const bottomRef = useRef(null);

  const { project, taskId, accountEmail, sessionFile } = selectedNode || {};

  // Check if task is currently running
  const taskList = tasks[project] || [];
  const task = taskList.find((t) => (t.id || t.task_id || t.taskId) === taskId);
  const isLive = task && ['running', 'monitoring'].includes(task.status);

  const loadContent = useCallback(async () => {
    if (!project || !taskId || !sessionFile) return;
    try {
      setLoading(true);
      const res = await api.getSessionContent(project, taskId, accountEmail || '', sessionFile);
      const content = res.data ?? res.content ?? res;
      setRawContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
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
    if (rawContent !== null) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawContent]);

  const segments = rawContent ? parseSessionContent(rawContent) : [];

  // Segment count for stats
  const userMsgs = segments.filter((s) => s.role === 'user').length;
  const asstMsgs = segments.filter((s) => s.role === 'assistant').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 12px',
        borderBottom: '1px solid #222233',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={13} style={{ color: 'rgba(0,212,170,0.6)', flexShrink: 0 }} />
              <h1 style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 14,
                color: '#ddddee',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {sessionFile || 'session'}
              </h1>
              {isLive && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00d4aa' }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00d4aa',
                    boxShadow: '0 0 4px rgba(0,212,170,0.7)',
                    animation: 'pulseDot 2s ease-in-out infinite',
                  }} />
                  live
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              {accountEmail && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555570' }}>
                  {accountEmail}
                </span>
              )}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#444460' }}>
                {project} / {taskId}
              </span>
              {segments.length > 0 && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333344' }}>
                  {userMsgs}↑ {asstMsgs}↓
                </span>
              )}
            </div>
          </div>

          <button
            onClick={loadContent}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              border: '1px solid #2a2a3d',
              background: 'transparent',
              color: '#555570',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#9999bb'; e.currentTarget.style.background = '#1a1a25'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555570'; e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128, gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,212,170,0.6)' }}>
            <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
            loading session…
          </div>
        ) : segments.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128 }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#333344', fontStyle: 'italic' }}>
              {sessionFile ? 'Empty session' : 'No session selected'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {segments.map((seg, i) => (
              <MessageBubble key={i} segment={seg} />
            ))}
          </div>
        )}

        {isLive && project && taskId && (
          <LiveMessages project={project} taskId={taskId} />
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
