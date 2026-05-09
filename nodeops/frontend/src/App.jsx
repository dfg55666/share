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
        background: 'rgba(0,212,170,0.1)',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #00d4aa, transparent)',
          width: '40%',
          animation: visible ? 'loadingSlide 1.2s ease-in-out infinite' : 'none',
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
        gap: '32px',
        userSelect: 'none',
        padding: '24px',
      }}
    >
      {/* ASCII-style logo */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: '#2a2a3d',
          lineHeight: 1.4,
          textAlign: 'center',
          letterSpacing: '0.05em',
        }}
      >
        {`╔═══════════════════╗\n║   NODEOPS MANAGER  ║\n╚═══════════════════╝`}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#9999bb',
            fontSize: '15px',
            fontWeight: 600,
            margin: '0 0 8px',
            letterSpacing: '0.05em',
          }}
        >
          Multi-account task orchestration
        </h2>
        <p
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#444460',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Manage NodeOps accounts, schedule AI tasks across accounts,
          auto-switch when credits are exhausted.
        </p>
      </div>

      {/* Quick-start grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: 360 }}>
        <QuickBtn
          label="+ New Project"
          desc="Create a project"
          accent
          onClick={() => setModal('newProject')}
        />
        <QuickBtn
          label="Manage Accounts"
          desc="Add / edit accounts"
          onClick={() => setModal('account')}
        />
      </div>

      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: '#222233',
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        {'// select a project, task, or session from the sidebar'}
      </div>
    </div>
  );
}

function QuickBtn({ label, desc, accent, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        padding: '12px 14px',
        border: `1px solid ${hover
          ? (accent ? 'rgba(0,212,170,0.5)' : '#3a3a50')
          : (accent ? 'rgba(0,212,170,0.25)' : '#2a2a3d')}`,
        background: hover
          ? (accent ? 'rgba(0,212,170,0.08)' : '#1a1a25')
          : (accent ? 'rgba(0,212,170,0.04)' : 'transparent'),
        color: accent ? '#00d4aa' : '#666680',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <span style={{ color: accent ? '#00d4aa' : '#8888aa' }}>{label}</span>
      <span style={{ fontSize: '10px', color: '#444460', fontWeight: 400 }}>{desc}</span>
    </button>
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
        const hasActive = taskList.some((t) =>
          ['running', 'pending', 'monitoring', 'switching', 'syncing', 'pushing'].includes(t.status)
        );
        if (hasActive) fetchTasks(pName);
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
        overflow: 'hidden',
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
        @keyframes loadingSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
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
