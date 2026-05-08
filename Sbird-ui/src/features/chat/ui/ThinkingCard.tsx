import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <span className={styles.headerTitle}>思考过程与工具调用</span>
        <span
          className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`}
        >
          <ChevronDown size={16} />
        </span>
      </div>

      {expanded && (
        <div className={styles.body}>
          {orderedItems.map((item, i) =>
            item.type === 'tool' ? (
              <ToolCallCard
                key={`tool-${i}`}
                label={item.label}
                name={item.name}
                status={item.status}
              />
            ) : (
              <p key={`step-${i}`} className={styles.step}>
                {item.text}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
