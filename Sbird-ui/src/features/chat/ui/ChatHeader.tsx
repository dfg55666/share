import { Bot, Plus } from 'lucide-react';
import styles from './ChatHeader.module.scss';

interface AgentInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  isAdd?: boolean;
}

interface ChatHeaderProps {
  title: string;
  sessionId?: string;
  agents?: AgentInfo[];
  onAddAgent?: () => void;
}

export default function ChatHeader({
  title,
  sessionId,
  agents,
  onAddAgent,
}: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      {/* Left: title + session id */}
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
        {sessionId && (
          <span className={styles.sessionId}>{sessionId}</span>
        )}
      </div>

      {/* Right: agent chips */}
      {agents && agents.length > 0 && (
        <div className={styles.agents}>
          {agents.map((agent) => {
            if (agent.isAdd) {
              return (
                <div
                  key={agent.id}
                  className={styles.chip}
                  onClick={onAddAgent}
                  role="button"
                  tabIndex={0}
                  aria-label="添加 Agent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onAddAgent?.();
                    }
                  }}
                >
                  <div
                    className={`${styles.chipAvatar} ${styles.chipAvatarAdd}`}
                  >
                    <Plus size={20} />
                  </div>
                  <span className={styles.chipName}>{agent.name}</span>
                  <span className={styles.chipTag}>添加</span>
                </div>
              );
            }

            return (
              <div key={agent.id} className={styles.chip}>
                <div
                  className={`${styles.chipAvatar} ${
                    !agent.avatarUrl ? styles.chipAvatarIcon : ''
                  }`}
                >
                  {agent.avatarUrl ? (
                    <img src={agent.avatarUrl} alt={agent.name} />
                  ) : (
                    <Bot size={20} />
                  )}
                </div>
                <span className={styles.chipName}>{agent.name}</span>
                <span className={styles.chipTag}>Agent</span>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
