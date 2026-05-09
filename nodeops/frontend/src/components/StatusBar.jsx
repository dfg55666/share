import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Activity, Users } from 'lucide-react';
import useDataStore from '../stores/dataStore';

export default function StatusBar() {
  const { overview, accounts, tasks, fetchOverview } = useDataStore();
  const [connected, setConnected] = useState(true);

  // Refresh overview every 10 s
  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => {
      fetchOverview()
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // Derive counts from store (fallback to computed values)
  const totalAccounts     = overview.total_accounts     ?? accounts.length;
  const availableAccounts = overview.available_accounts ?? accounts.filter((a) => a.status === 'available').length;
  const runningTasks      = overview.running_tasks      ?? Object.values(tasks).flat().filter((t) =>
    ['running', 'monitoring'].includes(t.status)
  ).length;
  const totalTasks        = overview.total_tasks        ?? Object.values(tasks).flat().length;

  const sep = (
    <span style={{ color: '#222233' }}>│</span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        height: 28,
        background: '#0d0d16',
        borderTop: '1px solid #1e1e2e',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        color: '#555570',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Accounts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Users size={9} style={{ color: '#333344' }} />
        <span>
          <span style={{ color: '#444460' }}>accounts: </span>
          <span style={{ color: '#00d4aa' }}>{availableAccounts}</span>
          <span style={{ color: '#333344' }}>/</span>
          <span style={{ color: '#888899' }}>{totalAccounts}</span>
          <span style={{ color: '#444460' }}> avail</span>
        </span>
      </div>

      {sep}

      {/* Tasks */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Activity size={9} style={{ color: '#333344' }} />
        <span>
          <span style={{ color: '#444460' }}>tasks: </span>
          <span style={{ color: runningTasks > 0 ? '#00d4aa' : '#888899' }}>
            {runningTasks}
          </span>
          <span style={{ color: '#444460' }}> running</span>
          {totalTasks > 0 && (
            <span style={{ color: '#333344' }}> / {totalTasks} total</span>
          )}
        </span>
      </div>

      {sep}

      {/* Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {connected ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#00d4aa',
                boxShadow: '0 0 4px rgba(0,212,170,0.6)',
              }}
            />
            <Wifi size={9} style={{ color: '#00d4aa' }} />
            <span style={{ color: '#00d4aa' }}>connected</span>
          </>
        ) : (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#ff6b4a',
              }}
            />
            <WifiOff size={9} style={{ color: '#ff6b4a' }} />
            <span style={{ color: '#ff6b4a' }}>disconnected</span>
          </>
        )}
      </div>

      {/* Spacer + version */}
      <div style={{ marginLeft: 'auto', color: '#222233' }}>
        nodeops-manager v0.1
      </div>
    </div>
  );
}
