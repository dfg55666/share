import React, { useState, useEffect } from 'react';
import {
  X, Plus, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Users, Copy, Check, AlertCircle,
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import useDataStore from '../stores/dataStore';
import { showToast } from './Toast';

function StatusBadge({ status }) {
  const map = {
    available:  { text: 'text-accent',    border: 'border-accent/30',    bg: 'bg-accent/10'    },
    exhausted:  { text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30', bg: 'bg-[#f59e0b]/10' },
    disabled:   { text: 'text-[#444460]', border: 'border-[#444460]/30', bg: 'bg-[#444460]/10' },
    error:      { text: 'text-warn',      border: 'border-warn/30',      bg: 'bg-warn/10'      },
  };
  const c = map[status] || map.disabled;
  return (
    <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${c.text} ${c.border} ${c.bg}`}>
      {status || 'unknown'}
    </span>
  );
}

function AccountRow({ account, onRefresh }) {
  const { removeAccount, refreshAccountCredits, updateAccount } = useDataStore();
  const [expanded, setExpanded] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [token,    setToken]    = useState(account.auth_token || '');
  const [saving,   setSaving]   = useState(false);

  const id = account.id || account.email;

  const handleRefresh = async () => {
    try {
      setBusy(true);
      await refreshAccountCredits(id);
      showToast('Credits refreshed', 'success');
    } catch (e) {
      showToast(`Refresh failed: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove account "${account.email}"?`)) return;
    try {
      setBusy(true);
      await removeAccount(id);
      showToast('Account removed', 'success');
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveToken = async () => {
    try {
      setSaving(true);
      await updateAccount(id, { auth_token: token });
      showToast('Token updated', 'success');
      setExpanded(false);
    } catch (e) {
      showToast(`Update failed: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-surface-3 bg-surface-2">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background:
              account.status === 'available' ? '#00d4aa'
              : account.status === 'exhausted' ? '#f59e0b'
              : '#444460',
          }}
        />

        {/* Email */}
        <span className="font-mono text-[12px] text-[#aaaacc] flex-1 min-w-0 truncate">
          {account.email}
        </span>

        {/* Credits */}
        {account.credits !== undefined && (
          <span className="font-mono text-[11px] text-[#555570] flex-shrink-0">
            {account.credits} cr
          </span>
        )}

        <StatusBadge status={account.status} />

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <IconButton
            icon={<RefreshCw size={12} className={busy ? 'animate-spin' : ''} />}
            title="Refresh credits"
            onClick={handleRefresh}
            disabled={busy}
          />
          <IconButton
            icon={expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            title="Edit token"
            onClick={() => setExpanded((v) => !v)}
          />
          <IconButton
            icon={<Trash2 size={12} />}
            title="Delete account"
            danger
            onClick={handleDelete}
            disabled={busy}
          />
        </div>
      </div>

      {/* Expanded token editor */}
      {expanded && (
        <div className="border-t border-surface-3 px-3 py-2 bg-surface-1 animate-fade-in">
          <label className="block font-mono text-[10px] text-[#444460] uppercase tracking-widest mb-1">
            auth token
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
            className="w-full bg-surface-0 border border-surface-3 text-[11px] font-mono text-[#9999bb] px-2 py-1.5 resize-none focus:outline-none focus:border-accent/40 placeholder-[#333344]"
            placeholder="paste auth token here…"
          />
          {account.deployment_id && (
            <div className="mt-1 font-mono text-[10px] text-[#444460]">
              deployment: {account.deployment_id}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSaveToken}
              disabled={saving}
              className="px-3 py-1 bg-accent/10 border border-accent/30 text-accent text-[11px] font-mono hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="px-3 py-1 border border-surface-3 text-[#555570] text-[11px] font-mono hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({ icon, title, danger, disabled, onClick }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        w-7 h-7 flex items-center justify-center border transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${danger
          ? 'border-transparent text-[#555570] hover:text-warn hover:border-warn/30 hover:bg-warn/10'
          : 'border-transparent text-[#555570] hover:text-[#9999bb] hover:bg-surface-3'}
      `}
    >
      {icon}
    </button>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────────────────
function AddAccountForm({ onDone }) {
  const { addAccount } = useDataStore();
  const [email,      setEmail]      = useState('');
  const [authToken,  setAuthToken]  = useState('');
  const [deployId,   setDeployId]   = useState('');
  const [runtimeH,   setRuntimeH]   = useState('');
  const [projToken,  setProjToken]  = useState('');
  const [expanded,   setExpanded]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { showToast('Email is required', 'error'); return; }
    try {
      setLoading(true);
      await addAccount({
        email: email.trim(),
        auth_token:    authToken.trim()  || undefined,
        deployment_id: deployId.trim()   || undefined,
        runtime_host:  runtimeH.trim()   || undefined,
        project_token: projToken.trim()  || undefined,
      });
      showToast('Account added', 'success');
      setEmail(''); setAuthToken(''); setDeployId(''); setRuntimeH(''); setProjToken('');
      onDone?.();
    } catch (e) {
      showToast(`Add failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-surface-3 bg-surface-2 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Plus size={12} className="text-accent" />
        <span className="font-mono text-[11px] text-accent uppercase tracking-widest">
          add account
        </span>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          className="flex-1 bg-surface-0 border border-surface-3 text-[12px] font-mono text-[#aaaacc] px-2 py-1.5 focus:outline-none focus:border-accent/40 placeholder-[#333344]"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2 border border-surface-3 text-[#555570] hover:text-[#9999bb] text-[10px] font-mono hover:bg-surface-3 transition-colors"
        >
          {expanded ? '− less' : '+ more'}
        </button>
      </div>

      <textarea
        value={authToken}
        onChange={(e) => setAuthToken(e.target.value)}
        placeholder="auth_token (optional)"
        rows={2}
        className="w-full bg-surface-0 border border-surface-3 text-[11px] font-mono text-[#9999bb] px-2 py-1.5 resize-none focus:outline-none focus:border-accent/40 placeholder-[#333344] mb-2"
      />

      {expanded && (
        <div className="grid grid-cols-2 gap-2 mb-2 animate-fade-in">
          {[
            [deployId,  setDeployId,  'deployment_id'],
            [runtimeH,  setRuntimeH,  'runtime_host'],
            [projToken, setProjToken, 'project_token'],
          ].map(([val, setter, ph]) => (
            <input
              key={ph}
              value={val}
              onChange={(e) => setter(e.target.value)}
              placeholder={ph}
              className="bg-surface-0 border border-surface-3 text-[11px] font-mono text-[#9999bb] px-2 py-1.5 focus:outline-none focus:border-accent/40 placeholder-[#333344]"
            />
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-1.5 bg-accent/10 border border-accent/30 text-accent font-mono text-[11px] hover:bg-accent/20 transition-colors disabled:opacity-40"
      >
        {loading ? 'Adding…' : 'Add Account'}
      </button>
    </form>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function AccountModal() {
  const { setModal } = useAppStore();
  const { accounts, fetchAccounts } = useDataStore();

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const available = accounts.filter((a) => a.status === 'available').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
    >
      <div
        className="relative w-full max-w-xl max-h-[80vh] flex flex-col bg-surface-1 border border-surface-3 shadow-2xl animate-fade-in"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-accent" />
            <span className="font-mono font-semibold text-sm text-[#ccccee]">Accounts</span>
            <span className="font-mono text-[11px] text-[#444460]">
              {available}/{accounts.length} available
            </span>
          </div>
          <button
            onClick={() => setModal(null)}
            className="text-[#555570] hover:text-[#ccccee] transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          <AddAccountForm onDone={fetchAccounts} />

          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-[#444460] uppercase tracking-widest">
              accounts ({accounts.length})
            </span>
            <div className="flex-1 h-px bg-surface-3" />
          </div>

          {accounts.length === 0 ? (
            <p className="font-mono text-[11px] text-[#333344] italic text-center py-4">
              No accounts configured
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {accounts.map((acc, i) => (
                <AccountRow key={acc.id || acc.email || i} account={acc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
