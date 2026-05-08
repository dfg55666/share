import styles from './MentionPopup.module.scss';

export interface MentionOption {
  id: string;
  label: string;
  description?: string;
  icon?: 'agent' | 'tool';
}

interface MentionPopupProps {
  options: MentionOption[];
  query: string;
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
}

export default function MentionPopup({ options, query, onSelect, onClose }: MentionPopupProps) {
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  if (filtered.length === 0) return null;

  return (
    <div className={styles.popup}>
      <div className={styles.header}>提及</div>
      <ul className={styles.list}>
        {filtered.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={styles.item}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(option);
              }}
            >
              <span className={styles.icon}>
                {option.icon === 'tool' ? '🔧' : '🤖'}
              </span>
              <span className={styles.label}>{option.label}</span>
              {option.description && (
                <span className={styles.desc}>{option.description}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
