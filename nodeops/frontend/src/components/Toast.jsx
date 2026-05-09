import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// ─── Singleton event bus ──────────────────────────────────────────────────────
const listeners = new Set();
let nextId = 1;

export function showToast(message, type = 'error') {
  const id = nextId++;
  listeners.forEach((fn) => fn({ id, message, type }));
}

// ─── Toast container (mount once in App) ─────────────────────────────────────
export default function Toast() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => remove(toast.id), 4000);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const icons = {
    error:   <AlertTriangle size={14} className="text-warn flex-shrink-0" />,
    success: <CheckCircle   size={14} className="text-accent flex-shrink-0" />,
    info:    <Info          size={14} className="text-info flex-shrink-0" />,
  };

  const borders = {
    error:   'border-warn/30',
    success: 'border-accent/30',
    info:    'border-info/30',
  };

  return (
    <div
      className={`
        pointer-events-auto animate-fade-in
        flex items-start gap-2 px-3 py-2.5 min-w-[260px] max-w-[380px]
        bg-surface-2 border ${borders[toast.type] || borders.info}
        shadow-xl text-xs font-mono text-[#e0e0e0]
      `}
      style={{ borderLeft: '2px solid' }}
    >
      {icons[toast.type] || icons.info}
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 text-surface-4 hover:text-[#e0e0e0] transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
