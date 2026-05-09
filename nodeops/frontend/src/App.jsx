import React, { useEffect, useRef } from 'react';
import useAppStore from './stores/appStore';
import useDataStore from './stores/dataStore';

import Sidebar         from './components/Sidebar';
import StatusBar       from './components/StatusBar';
import ProjectView     from './components/ProjectView';
import TaskView        from './components/TaskView';
import SessionView     from './components/SessionView';
import AccountModal    from './components/AccountModal';
import NewProjectModal from './components/NewProjectModal';
import NewTaskModal    from './components/NewTaskModal';
import Toast           from './components/Toast';

// ─── Loading bar ──────────────────────────────────────────────────────────────
function LoadingBar({ visible }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'rgba(0,212,170,0.15)',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
    >
      <div
        style={{
          height: '100%',
          background: '#00d4aa',
          width: visible ? '100%' : '0%',
          transition: visible ? 'width 1.5s ease-out' : 'none',
        }}
      />
    </div>
  );
}

// ─── Welcome panel ────────────────────────────────────────────────────────────
function WelcomePanel() {
  const { setModal } = useAppStore();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '24px',
        userSelect: 'none',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: '#333344',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          nodeops manager
        </div>
        <h2
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#444460',
            fontSize: '18px',
            fontWeight: 400,
            margin: 0,
          }}
        >
          Select a project, task, or session
        </h2>
        <p
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#333344',
            marginTop: '8px',
          }}
        >
          from the sidebar to get started
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setModal('newProject')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: '1px solid rgba(0,212,170,0.3)',
            background: 'rgba(0,212,170,0.05)',
            color: '#00d4aa',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,212,170,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,212,170,0.05)')}
        >
          + New Project
        </button>
        <button
          onClick={() => setModal('account')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: '1px solid #2a2a3d',
            background: 'transparent',
            color: '#666680',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1a1a25';
            e.currentTarget.style.color = '#9999bb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#666680';
          }}
        >
          Manage Accounts
        </button>
      </div>

      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: '#222233',
          textAlign: 'center',
          maxWidth: '300px',
          lineHeight: '1.8',
          whiteSpace: 'pre-line',
        }}
      >
        {'// multi-account task orchestration\n// powered by nodeops agents'}
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
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      <LoadingBar visible={loading} />
      <div style={{ height: '100%', overflowY: 'auto' }}>
        {renderPanel()}
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { modalOpen } = useAppStore();
  const { fetchProjects, fetchAccounts, fetchOverview, fetchTasks, tasks } = useDataStore();
  const pollerRef = useRef(null);

  // Initial data load
  useEffect(() => {
    fetchProjects();
    fetchAccounts();
    fetchOverview();
  }, []);

  // Auto-refresh running tasks every 8 s
  useEffect(() => {
    const poll = () => {
      const projectNames = Object.keys(tasks);
      projectNames.forEach((pName) => {
        const taskList = tasks[pName] || [];
        const hasRunning = taskList.some((t) => t.status === 'running' || t.status === 'pending');
        if (hasRunning) fetchTasks(pName);
      });
      fetchOverview();
    };
    pollerRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollerRef.current);
  }, [tasks]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        color: '#ccccee',
        height: '100vh',
        background: '#0a0a0f',
      }}
    >
      <Toast />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <ContentArea />
      </div>

      <StatusBar />

      {modalOpen === 'account'    && <AccountModal />}
      {modalOpen === 'newProject' && <NewProjectModal />}
      {modalOpen === 'newTask'    && <NewTaskModal />}

      {/* CreateOS badge */}
      <style>{`
        #createos-badge {
          position: fixed;
          bottom: 40px;
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
