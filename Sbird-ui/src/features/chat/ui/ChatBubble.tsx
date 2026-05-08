import { Bot } from 'lucide-react';
import styles from './ChatBubble.module.scss';

interface ChatBubbleProps {
  role: 'user' | 'agent';
  senderName?: string;
  senderTag?: string;
  time?: string;
  content: string;
  avatarIcon?: boolean;
}

export default function ChatBubble({
  role,
  senderName,
  senderTag,
  time,
  content,
  avatarIcon = true,
}: ChatBubbleProps) {
  if (role === 'user') {
    return (
      <div className={`${styles.bubble} ${styles.user}`}>
        <div className={styles.userMeta}>
          {senderName && (
            <span className={styles.senderLabel}>{senderName}</span>
          )}
          {time && <span className={styles.timeLabel}>{time}</span>}
        </div>
        <div className={styles.userText}>{content}</div>
      </div>
    );
  }

  // Agent
  return (
    <div className={`${styles.bubble} ${styles.agent}`}>
      <div className={styles.agentMeta}>
        {avatarIcon && (
          <div className={styles.avatar}>
            <Bot size={18} />
          </div>
        )}
        {senderName && (
          <span className={styles.agentName}>{senderName}</span>
        )}
        {senderTag && (
          <span className={styles.agentBadge}>{senderTag}</span>
        )}
        {time && <span className={styles.timeLabel}>{time}</span>}
      </div>
      <div className={styles.agentBody}>
        {content.split('\n').map((line, i) => (
          <p key={i} className={styles.agentText}>{line}</p>
        ))}
      </div>
    </div>
  );
}
