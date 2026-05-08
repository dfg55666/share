import { useCallback, useEffect, useRef, useState } from 'react';
import ChatBubble from './ChatBubble';
import ThinkingCard from './ThinkingCard';
import styles from './ChatTimeline.module.scss';

interface TimelineMessage {
  id: string;
  role: 'user' | 'agent';
  senderName: string;
  senderTag?: string;
  time: string;
  content: string;
  thinking?: {
    steps: { text: string }[];
    toolCalls?: {
      label: string;
      name: string;
      status: 'success' | 'loading' | 'error';
    }[];
    items?: Array<
      | { type: 'step'; text: string }
      | {
          type: 'tool';
          label: string;
          name: string;
          status: 'success' | 'loading' | 'error';
        }
    >;
  };
}

interface ChatTimelineProps {
  messages: TimelineMessage[];
}

const ESTIMATED_ITEM_HEIGHT = 80;
const BUFFER_COUNT = 5;

export default function ChatTimeline({ messages }: ChatTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });

  const updateVisibleRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const viewHeight = el.clientHeight;
    const start = Math.max(
      0,
      Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - BUFFER_COUNT,
    );
    const visibleCount = Math.ceil(viewHeight / ESTIMATED_ITEM_HEIGHT);
    const end = Math.min(
      messages.length,
      start + visibleCount + BUFFER_COUNT * 2,
    );

    setVisibleRange({ start, end });
  }, [messages.length]);

  useEffect(() => {
    updateVisibleRange();
  }, [messages.length, updateVisibleRange]);

  const handleScroll = () => {
    updateVisibleRange();
  };

  if (messages.length < 50) {
    return (
      <div className={styles.timeline} ref={containerRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${
              msg.role === 'user'
                ? styles.messageRowUser
                : styles.messageRowAgent
            }`}
          >
            {msg.role === 'agent' && msg.thinking && (
              <div className={styles.thinkingWrapper}>
                <ThinkingCard
                  steps={msg.thinking.steps}
                  toolCalls={msg.thinking.toolCalls}
                  items={msg.thinking.items}
                  defaultExpanded={false}
                />
              </div>
            )}

            <ChatBubble
              role={msg.role}
              senderName={msg.senderName}
              senderTag={msg.senderTag}
              time={msg.time}
              content={msg.content}
              avatarIcon={msg.role === 'agent'}
            />
          </div>
        ))}
      </div>
    );
  }

  const topPadding = visibleRange.start * ESTIMATED_ITEM_HEIGHT;
  const bottomPadding =
    (messages.length - visibleRange.end) * ESTIMATED_ITEM_HEIGHT;
  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);

  return (
    <div className={styles.timeline} ref={containerRef} onScroll={handleScroll}>
      <div style={{ height: topPadding }} />
      {visibleMessages.map((msg) => (
        <div
          key={msg.id}
          className={`${styles.messageRow} ${
            msg.role === 'user' ? styles.messageRowUser : styles.messageRowAgent
          }`}
        >
          {msg.role === 'agent' && msg.thinking && (
            <div className={styles.thinkingWrapper}>
              <ThinkingCard
                steps={msg.thinking.steps}
                toolCalls={msg.thinking.toolCalls}
                items={msg.thinking.items}
                defaultExpanded={false}
              />
            </div>
          )}

          <ChatBubble
            role={msg.role}
            senderName={msg.senderName}
            senderTag={msg.senderTag}
            time={msg.time}
            content={msg.content}
            avatarIcon={msg.role === 'agent'}
          />
        </div>
      ))}
      <div style={{ height: bottomPadding }} />
    </div>
  );
}
