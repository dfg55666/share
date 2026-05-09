import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, MessageSquare, User, Bot, Activity,
  ChevronDown, ChevronUp, Copy, Check, Send, ImagePlus, X,
  ChevronRight, Folder, File,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import * as api from '../api';
import { showToast } from './Toast';

function extractHeaderValue(raw, key) {
  if (!raw || typeof raw !== 'string') return '';
  const prefix = `- ${key}:`;
  const line = raw.split('\n').find((l) => l.startsWith(prefix));
  if (!line) return '';
  return line.slice(prefix.length).trim();
}

// ─── Parse raw session .md content into segments ──────────────────────────────
// Handles both markdown format and raw SSE JSON lines.
function parseSessionContent(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.split('\n');
  const segments = [];
  let current = null;
  let pendingSseEvent = '';

  const flush = () => {
    if (current) {
      current.text = current.lines.join('\n').trim();
      if (current.text) segments.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        flush();
        if (obj.type === 'text' || obj.content || obj.message || obj.text) {
          const role = obj.role || (obj.type === 'user' ? 'user' : 'assistant');
          const text = obj.content || obj.message || obj.text || JSON.stringify(obj, null, 2);
          segments.push({ role, text });
        } else if (obj.event || obj.status || obj.type) {
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
      } catch (_) {}
    }

    if (/^event:\s*/i.test(trimmed)) {
      flush();
      pendingSseEvent = trimmed.replace(/^event:\s*/i, '').trim();
      continue;
    }
    if (/^data:\s*/i.test(trimmed)) {
      const payloadText = trimmed.replace(/^data:\s*/i, '').trim();
      if (payloadText) {
        try {
          const obj = JSON.parse(payloadText);
          flush();
          const sseRole = (obj.role || obj?.info?.role || '').toLowerCase();
          const sseText = obj.content || obj.message || obj.text
            || (Array.isArray(obj.parts)
              ? obj.parts.filter((p) => p?.type === 'text').map((p) => p.text || '').join('\n')
              : '');
          if (sseRole === 'user' || sseRole === 'assistant' || sseRole === 'system') {
            if (sseText && sseText.trim()) {
              segments.push({ role: sseRole, text: sseText });
            } else if (obj?.info?.error?.data?.message) {
              segments.push({ role: 'system', text: `[error] ${obj.info.error.data.message}` });
            }
          } else if (obj?.info?.error?.data?.message) {
            segments.push({ role: 'system', text: `[error] ${obj.info.error.data.message}` });
          } else {
            segments.push({
              role: 'system',
              text: `[${pendingSseEvent || 'sse'}] ${JSON.stringify(obj)}`,
            });
          }
          continue;
        } catch (_) {}
      }
    }

    if (/^\*{0,2}\[User\]\*{0,2}\s*/i.test(line)) {
      flush();
      current = { role: 'user', lines: [line.replace(/^\*{0,2}\[User\]\*{0,2}\s*/i, '').trim()] };
    } else if (/^\*{0,2}\[Assistant\]\*{0,2}\s*/i.test(line)) {
      flush();
      current = { role: 'assistant', lines: [line.replace(/^\*{0,2}\[Assistant\]\*{0,2}\s*/i, '').trim()] };
    } else if (/^\*{0,2}\[System\]\*{0,2}\s*/i.test(line)) {
      flush();
      segments.push({ role: 'system', text: line.replace(/^\*{0,2}\[System\]\*{0,2}\s*/i, '').trim() });
    } else if (/^\*{0,2}\[Unknown\]\*{0,2}\s*/i.test(line)) {
      flush();
      current = { role: 'system', lines: [line.replace(/^\*{0,2}\[Unknown\]\*{0,2}\s*/i, '').trim()] };
    } else if (/^---+$/.test(trimmed)) {
      flush();
      segments.push({ role: 'divider', text: '---' });
    } else if (/^#{1,3}\s/.test(line)) {
      flush();
      segments.push({ role: 'meta', text: line.replace(/^#+\s/, '') });
    } else if (/^-\s+(Account|NodeOps Session ID|Started|Ended|End Reason):/i.test(trimmed)) {
      flush();
      segments.push({ role: 'system', text: trimmed });
    } else if (trimmed === '') {
      if (current) current.lines.push('');
    } else {
      if (current) {
        current.lines.push(line);
      } else if (trimmed) {
        segments.push({ role: 'system', text: trimmed });
      }
    }
  }
  flush();
  return segments.filter((s) => s.role === 'divider' || (s.text && s.text.trim()));
}

function MessageBubble({ segment }) {
  const { role, text } = segment;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (role === 'divider') {
    return <div style={{ height: 1, background: '#e2e8f0', margin: '12px 16px' }} />;
  }

  if (role === 'meta') {
    return (
      <div style={{ padding: '4px 16px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#64748b',
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
          color: '#64748b',
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
        <div style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          background: isUser ? 'rgba(0,168,136,0.15)' : '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
          {isUser
            ? <User size={12} style={{ color: '#00a888' }} />
            : <Bot size={12} style={{ color: '#4a9eff' }} />}
        </div>

        <div style={{
          background: isUser ? 'rgba(0,168,136,0.08)' : '#f1f5f9',
          border: `1px solid ${isUser ? 'rgba(0,168,136,0.2)' : '#e2e8f0'}`,
          padding: '8px 12px',
          position: 'relative',
          minWidth: 60,
        }}>
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
                  color: '#6b7280',
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
                color: copied ? '#00a888' : '#6b7280',
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
            color: '#334155',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            margin: 0,
            paddingRight: isLong ? 30 : 20,
            maxHeight: (!isLong || expanded) ? 'none' : 120,
            overflow: (!isLong || expanded) ? 'visible' : 'hidden',
          }}>
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}

function FileNode({ node, accountId, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDir = node.type === 'directory' || node.is_dir === true || Array.isArray(node.children);
  const indent = depth * 16 + 8;

  const handleClick = async () => {
    if (isDir) {
      setOpen((v) => !v);
      return;
    }
    if (content !== null) {
      setContent(null);
      return;
    }
    if (!accountId) {
      showToast('No account for workspace', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await api.getFileContent(accountId, node.path || node.name);
      if (res?.is_binary) {
        setContent('[binary file]');
      } else {
        setContent(res?.data ?? res ?? '');
      }
    } catch (e) {
      showToast(`Failed to load file: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyContent = (e) => {
    e.stopPropagation();
    if (content == null) return;
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          paddingTop: 3,
          paddingBottom: 3,
          paddingLeft: indent,
          paddingRight: 8,
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: isDir ? '#475569' : '#4b5563',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {isDir
          ? (open ? <ChevronDown size={10} style={{ color: '#6b7280' }} /> : <ChevronRight size={10} style={{ color: '#6b7280' }} />)
          : <span style={{ width: 10, flexShrink: 0 }} />}
        {isDir
          ? <Folder size={11} style={{ color: 'rgba(0,168,136,0.5)', flexShrink: 0 }} />
          : <File size={11} style={{ color: '#6b7280', flexShrink: 0 }} />}
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: isDir ? '#475569' : '#4b5563',
        }}>
          {node.name}
        </span>
        {loading && <RefreshCw size={9} style={{ color: '#00a888', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
      </button>

      {content !== null && !isDir && (
        <div style={{
          margin: '2px 8px 4px 8px',
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          overflow: 'auto',
          maxHeight: 320,
          position: 'relative',
        }}>
          <button
            onClick={copyContent}
            title="Copy"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: copied ? '#00a888' : '#6b7280',
              padding: '2px 6px',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? 'copied' : 'copy'}
          </button>
          <pre style={{
            padding: '10px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: '#334155',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

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

function SessionFilesTab({ accountId, accountEmail }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTree = useCallback(async () => {
    if (!accountId) {
      setTree([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getFileTree(accountId, '');
      const nodes = res.data ?? res ?? [];
      setTree(Array.isArray(nodes) ? nodes : []);
    } catch (e) {
      showToast(`Failed to load workspace: ${e.message}`, 'error');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setTree(null);
    loadTree();
  }, [loadTree]);

  if (!accountId) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
        Account not found for this session.
      </div>
    );
  }

  if (loading && !tree) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,168,136,0.6)' }}>
        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        loading workspace…
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
        No files found in workspace.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 8px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          workspace
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94a3b8' }}>
          {accountEmail || accountId}
        </span>
        <button
          onClick={loadTree}
          disabled={loading}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00a888')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </button>
      </div>
      {tree.map((node, i) => (
        <FileNode key={i} node={node} accountId={accountId} />
      ))}
    </div>
  );
}

function SessionComposer({ sessionId, accountId, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [imageName, setImageName] = useState('');
  const inputRef = useRef(null);

  const canSend = Boolean(sessionId && accountId && !sending && (text.trim() || imageDataUrl));

  const pickImage = () => inputRef.current?.click();

  const onImageChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!String(f.type || '').startsWith('image/')) {
      showToast('Only image files are supported', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result || ''));
      setImageMime(f.type || 'image/png');
      setImageName(f.name || 'image');
    };
    reader.onerror = () => showToast('Failed to read image file', 'error');
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const clearImage = () => {
    setImageDataUrl('');
    setImageMime('');
    setImageName('');
  };

  const send = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      await api.sendSessionMessage(sessionId, accountId, {
        text: text.trim() || null,
        image_url: imageDataUrl || null,
        image_mime: imageMime || null,
        no_reply: false,
      });
      setText('');
      clearImage();
      showToast('Message sent', 'success');
      onSent?.();
    } catch (e) {
      showToast(`Send failed: ${e.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const disabledHint = !sessionId
    ? 'Session ID missing from history file'
    : !accountId
      ? 'Cannot map session account to local account pool'
      : '';

  return (
    <div style={{
      borderTop: '1px solid #e2e8f0',
      padding: '10px 12px',
      background: '#ffffff',
      flexShrink: 0,
    }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Send message to upstream session..."
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          border: '1px solid #cbd5e1',
          outline: 'none',
          padding: '8px 10px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#334155',
          background: '#f8fafc',
        }}
      />

      {imageDataUrl && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '6px 8px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#475569',
        }}>
          <img
            src={imageDataUrl}
            alt="preview"
            style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid #cbd5e1' }}
          />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {imageName || 'image'}
          </span>
          <button
            onClick={clearImage}
            style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onImageChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={pickImage}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#475569',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
          }}
        >
          <ImagePlus size={12} />
          Image
        </button>

        <button
          onClick={send}
          disabled={!canSend}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            border: '1px solid rgba(0,168,136,0.35)',
            background: canSend ? 'rgba(0,168,136,0.08)' : '#f8fafc',
            color: canSend ? '#00a888' : '#94a3b8',
            cursor: canSend ? 'pointer' : 'not-allowed',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            opacity: sending ? 0.75 : 1,
          }}
          title={disabledHint}
        >
          {sending ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
          Send
        </button>
      </div>

      {disabledHint && (
        <p style={{
          margin: '8px 0 0',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: '#64748b',
          fontStyle: 'italic',
        }}>
          {disabledHint}
        </p>
      )}
    </div>
  );
}

// ─── Live SSE message stream ──────────────────────────────────────────────────
function LiveMessages({ project, taskId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getTaskMessages(project, taskId)
      .then((res) => {
        const msgs = res.data ?? res ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const es = api.createTaskEventSource(project, taskId);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, data]);
      } catch (_) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,168,136,0.6)' }}>
        <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
        loading live messages…
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <Activity size={11} style={{ color: '#00a888' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00a888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          live stream
        </span>
        {connected && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00a888',
            boxShadow: '0 0 4px rgba(0,168,136,0.6)',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
        )}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
          {messages.length} events
        </span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {messages.length === 0 && (
          <p style={{ padding: '8px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
            no live events yet
          </p>
        )}
        {messages.map((msg, i) => {
          const role = msg.role || msg.type || 'system';
          const text = msg.content || msg.message || msg.text || JSON.stringify(msg);
          const isUser = role === 'user';
          const isAssistant = role === 'assistant';
          return (
            <div key={i} style={{ padding: '2px 16px' }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                lineHeight: 1.5,
                padding: '6px 10px',
                background: isUser ? 'rgba(0,168,136,0.08)'
                  : isAssistant ? '#f1f5f9'
                  : 'rgba(241,245,249,0.5)',
                borderLeft: `2px solid ${isUser ? '#00a888' : isAssistant ? '#4a9eff' : '#cbd5e1'}`,
                color: '#334155',
              }}>
                {role && (
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, display: 'block', marginBottom: 2 }}>
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

export default function SessionView() {
  const { selectedNode } = useAppStore();
  const { tasks, accounts, fetchAccounts } = useDataStore();

  const [rawContent, setRawContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const bottomRef = useRef(null);

  const { project, taskId, accountDir, accountEmail, sessionFile, sessionId: selectedSessionId } = selectedNode || {};

  const taskList = tasks[project] || [];
  const task = taskList.find((t) => (t.id || t.task_id || t.taskId) === taskId);
  const isLive = task && ['running', 'monitoring'].includes(task.status);

  const loadContent = useCallback(async () => {
    if (!project || !taskId || !sessionFile) return;
    try {
      setLoading(true);
      const res = await api.getSessionContent(project, taskId, accountDir || accountEmail || '', sessionFile);
      const payload = res?.data ?? res ?? {};
      const content = typeof payload === 'string'
        ? payload
        : (payload?.content ?? res?.content ?? '');
      setRawContent(typeof content === 'string' ? content : '');
    } catch (e) {
      showToast(`Failed to load session: ${e.message}`, 'error');
      setRawContent('');
    } finally {
      setLoading(false);
    }
  }, [project, taskId, accountDir, accountEmail, sessionFile]);

  useEffect(() => {
    setRawContent(null);
    setActiveTab('chat');
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      fetchAccounts();
    }
  }, [accounts, fetchAccounts]);

  useEffect(() => {
    if (rawContent !== null) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawContent]);

  const segments = rawContent ? parseSessionContent(rawContent) : [];
  const userMsgs = segments.filter((s) => s.role === 'user').length;
  const asstMsgs = segments.filter((s) => s.role === 'assistant').length;

  const headerAccountEmail = extractHeaderValue(rawContent, 'Account');
  const effectiveAccountEmail = accountEmail || headerAccountEmail;
  const headerSessionId = extractHeaderValue(rawContent, 'NodeOps Session ID');
  const effectiveSessionId = selectedSessionId || headerSessionId;

  const matchedAccount = (accounts || []).find((a) => a.email === effectiveAccountEmail);
  const effectiveAccountId = matchedAccount?.id || task?.current_account_id || '';

  const tabs = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={12} /> },
    { id: 'files', label: 'Files', icon: <File size={12} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        padding: '20px 24px 0',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={13} style={{ color: 'rgba(0,168,136,0.6)', flexShrink: 0 }} />
              <h1 style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 14,
                color: '#0f172a',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {sessionFile || 'session'}
              </h1>
              {isLive && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00a888' }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00a888',
                    boxShadow: '0 0 4px rgba(0,168,136,0.7)',
                    animation: 'pulseDot 2s ease-in-out infinite',
                  }} />
                  live
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              {effectiveAccountEmail && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6b7280' }}>
                  {effectiveAccountEmail}
                </span>
              )}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                {project} / {taskId}
              </span>
              {effectiveSessionId && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94a3b8' }}>
                  {effectiveSessionId.slice(0, 8)}…
                </span>
              )}
              {segments.length > 0 && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94a3b8' }}>
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
              border: '1px solid #cbd5e1',
              background: 'transparent',
              color: '#6b7280',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#334155'; e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw size={11} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#00a888' : 'transparent'}`,
                color: activeTab === tab.id ? '#00a888' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#334155'; }}
              onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#6b7280'; }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'chat' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128, gap: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,168,136,0.6)' }}>
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                loading session…
              </div>
            ) : segments.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128 }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
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

            {isLive && project && taskId && <LiveMessages project={project} taskId={taskId} />}
            <div ref={bottomRef} />
          </div>

          <SessionComposer
            sessionId={effectiveSessionId}
            accountId={effectiveAccountId}
            onSent={loadContent}
          />
        </div>
      )}

      {activeTab === 'files' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SessionFilesTab accountId={effectiveAccountId} accountEmail={effectiveAccountEmail} />
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
