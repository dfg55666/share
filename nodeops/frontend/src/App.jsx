import React, { useEffect, useState } from 'react';
import useAppStore from './stores/appStore';
import useDataStore from './stores/dataStore';

import Sidebar       from './components/Sidebar';
import StatusBar     from './components/StatusBar';
import ProjectView   from './components/ProjectView';
import TaskView      from './components/TaskView';
import SessionView   from './components/SessionView';
import AccountModal  from './components/AccountModal';
import NewProjectModal from './components/NewProjectModal';
import NewTaskModal  from './components/NewTaskModal';
import Toast         from './components/Toast';

// ─── Loading bar ──────────────────────────────────────────────────────────────
function LoadingBar({ visible }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[2px] bg-accent/20 overflow-hidden transition-opacity"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-accent"
        style={{
          width: visible ? '100%' : '0%',
          transition: visible ? 'width 1.5s ease-out' : 'none',
        }}
      />
    </div>
  );
}

// ─── Empty / Welcome panel ────────────────────────────────────────────────────
function WelcomePanel() {
  const { setModal } = useAppStore();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 select-none">
      <div className="text-center">
        <div className="font-mono text-[10px] text-[#333344] tracking-[0.3em] uppercase mb-3">
          nodeops manager
        </div>
        <h2 className="font-mono text-[#444460] text-lg font-normal">
          Select a project, task, or session
        </h2>
        <p className="font-mono text-[11px] text-[#333344] mt-2">
          from the sidebar to get started
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setModal('newProject')}
          className="flex items-center gap-2 px-4 py-2 border border-accent/30 bg-accent/5 text-accent font-mono text-[11px] hover:bg-accent/10 transition-colors"
        >
          + New Project
        </button>
        <button
          onClick={() => setModal('account')}
          className="flex items-center gap-2 px-4 py-2 border border-surface-4 text-[#666680] font-mono text-[11px] hover:bg-surface-2 hover:text-[#9999bb] transition-colors"
        >
          Manage Accounts
        </button>
      </div>

      <div
        className="font-mono text-[10px] text-[#222233] text-center"
        style={{ maxWidth: '300px', lineHeight: '1.8' }}
      >
        {`// multi-account task orchestration\n// powered by nodeops agents`}
      </div>
    </div>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────
function ContentArea() {
  const { selectedNode } = useAppStore();
  const { loading } = useDataStore();

  const renderPanel = () => {
    if (!selectedNode) return <WelcomePanel />;
    switch (selectedNode.type) {
      case 'project': return <ProjectView />;
      case 'task':    return <TaskView />;
      case 'session': return <SessionView />;
      default:        return <WelcomePanel />;
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-surface-0">
      <LoadingBar visible={loading} />
      <div className="h-full overflow-y-auto">
        {renderPanel()}
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { modalOpen } = useAppStore();
  const { fetchProjects, fetchAccounts, fetchOverview } = useDataStore();

  // Initial data load
  useEffect(() => {
    fetchProjects();
    fetchAccounts();
    fetchOverview();
  }, [fetchProjects, fetchAccounts, fetchOverview]);

  return (
    <div
      className="flex flex-col font-sans text-[#ccccee]"
      style={{ height: '100vh', background: '#0a0a0f' }}
    >
      {/* Toast container */}
      <Toast />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentArea />
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      {modalOpen === 'account'    && <AccountModal />}
      {modalOpen === 'newProject' && <NewProjectModal />}
      {modalOpen === 'newTask'    && <NewTaskModal />}

      {/* CreateOS badge */}
      <style>{`
        #createos-badge {
          position: fixed;
          bottom: 12px;
          right: 12px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10);
          font-size: 11px;
          font-weight: 500;
          color: #374151;
          text-decoration: none;
          font-family: system-ui, sans-serif;
        }
        #createos-badge:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        #createos-badge img { width: 14px; height: 14px; }
      `}</style>
      <a
        id="createos-badge"
        href="https://createos.sh/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="https://nodeops.network/SymbolBlack.svg" alt="" />
        Built with CreateOS
      </a>
    </div>
  );
}
