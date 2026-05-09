import { Bot } from 'lucide-react';
import ThinkingCard from './ThinkingCard';
import styles from './ChatBubble.module.scss';

interface ChatBubbleProps {
  role: 'user' | 'agent';
  senderName?: string;
  senderTag?: string;
  time?: string;
  content: string;
  avatarIcon?: boolean;
  thinking?: {
    steps: { text: string }[];
    toolCalls?: { label: string; name: string; status: 'success' | 'loading' | 'error' }[];
    items?: Array<
      | { type: 'step'; text: string }
      | { type: 'tool'; label: string; name: string; status: 'success' | 'loading' | 'error' }
    >;
  };
}

export default function ChatBubble({
  role,
  senderName,
  senderTag,
  time,
  content,
  avatarIcon = true,
  thinking,
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
        {/* 思考折叠区（嵌入气泡内部） */}
        {thinking && (
          <ThinkingCard
            steps={thinking.steps}
            toolCalls={thinking.toolCalls}
            items={thinking.items}
            defaultExpanded={false}
          />
        )}
        {/* 正文内容 */}
        {content.split('\n').map((line, i) => (
          <p key={i} className={styles.agentText}>{line}</p>
        ))}
      </div>
    </div>
  );
}
