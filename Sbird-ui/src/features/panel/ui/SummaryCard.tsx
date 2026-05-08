import React from 'react';
import styles from './SummaryCard.module.scss';

export interface SummaryCardProps {
  title: string;
  lines: string[];
  actionLabel?: string;
  onAction?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  lines,
  actionLabel,
  onAction,
}) => {
  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>

      <div className={styles.content}>
        {lines.map((line, i) => (
          <p key={i} className={styles.line}>
            {line}
          </p>
        ))}
      </div>

      <div className={styles.footer}>
        {/* Decorative concentric circles */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
          className={styles.decoration}
        >
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="#d8b4fe"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle
            cx="20"
            cy="20"
            r="10"
            stroke="#c084fc"
            strokeWidth="1"
          />
          <circle
            cx="20"
            cy="20"
            r="3"
            fill="#a855f7"
          />
        </svg>

        {actionLabel && (
          <button
            className={styles.actionBtn}
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
