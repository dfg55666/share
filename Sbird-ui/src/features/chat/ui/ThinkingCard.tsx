import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import ToolCallCard from './ToolCallCard';
import styles from './ThinkingCard.module.scss';

interface ThinkingStep {
  text: string;
}

interface ToolCall {
  label: string;
  name: string;
  status: 'success' | 'loading' | 'error';
}

type ThinkingItem =
  | { type: 'step'; text: string }
  | {
      type: 'tool';
      label: string;
      name: string;
      status: 'success' | 'loading' | 'error';
    };

interface ThinkingCardProps {
  steps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  items?: ThinkingItem[];
  defaultExpanded?: boolean;
}

export default function ThinkingCard({
  steps = [],
  toolCalls,
  items,
  defaultExpanded = false,
}: ThinkingCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const orderedItems: ThinkingItem[] =
    items ??
    [
      ...steps.map((step) => ({ type: 'step' as const, text: step.text })),
      ...(toolCalls ?? []).map((tool) => ({ type: 'tool' as const, ...tool })),
    ];

  const count = orderedItems.length;

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <div className={styles.thinkingInline}>
      {/* 折叠行 */}
      <div
        className={styles.toggleRow}
        onClick={toggle}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <span className={styles.circleIcon}>◎</span>
        <span className={styles.toggleText}>
          思考了 {count} 步
        </span>
        <span
          className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className={styles.stepList}>
          {orderedItems.map((item, i) =>
            item.type === 'tool' ? (
              <ToolCallCard
                key={`tool-${i}`}
                label={item.label}
                name={item.name}
                status={item.status}
              />
            ) : (
              <div key={`step-${i}`} className={styles.stepItem}>
                <span className={styles.dot} />
                <span className={styles.stepText}>{item.text}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
