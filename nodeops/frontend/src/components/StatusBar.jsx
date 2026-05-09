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
      fetchOverview().then(() => setConnected(true)).catch(() => setConnected(false));
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // Derive counts from store data (fallback to computed values from tasks/accounts)
  const totalAccounts     = overview.total_accounts     ?? accounts.length;
  const availableAccounts = overview.available_accounts ?? accounts.filter((a) => a.status === 'available').length;
  const runningTasks      = overview.running_tasks      ?? Object.values(tasks).flat().filter((t) => t.status === 'running').length;
  const totalTasks        = overview.total_tasks        ?? Object.values(tasks).flat().length;

  return (
    <div
      className="flex items-center gap-6 px-4 py-1.5 bg-surface-1 border-t border-surface-3 font-mono text-[11px] text-[#666680] select-none flex-shrink-0"
      style={{ height: '28px' }}
    >
      {/* Accounts */}
      <div className="flex items-center gap-1.5">
        <Users size={10} className="text-surface-4" />
        <span>
          accounts:{' '}
          <span className="text-accent">{availableAccounts}</span>
          <span className="text-[#444460]">/</span>
          <span className="text-[#999]">{totalAccounts}</span>
          {' '}available
        </span>
      </div>

      <div className="text-surface-4">│</div>

      {/* Tasks */}
      <div className="flex items-center gap-1.5">
        <Activity size={10} className="text-surface-4" />
        <span>
          tasks:{' '}
          <span className={runningTasks > 0 ? 'text-accent' : 'text-[#999]'}>
            {runningTasks}
          </span>
          {' '}running
          {totalTasks > 0 && (
            <span className="text-[#444460]"> / {totalTasks} total</span>
          )}
        </span>
      </div>

      <div className="text-surface-4">│</div>

      {/* Connection */}
      <div className="flex items-center gap-1.5">
        {connected ? (
          <>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-accent"
              style={{ boxShadow: '0 0 4px rgba(0,212,170,0.6)' }}
            />
            <Wifi size={10} className="text-accent" />
            <span className="text-accent">connected</span>
          </>
        ) : (
          <>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-warn" />
            <WifiOff size={10} className="text-warn" />
            <span className="text-warn">disconnected</span>
          </>
        )}
      </div>

      {/* Spacer + version */}
      <div className="ml-auto text-[#333344]">nodeops-manager v0.1</div>
    </div>
  );
}
