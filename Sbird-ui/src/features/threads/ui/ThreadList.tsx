import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './ThreadList.module.scss';

export interface ThreadItem {
  id: string;
  title: string;
  active?: boolean;
}

export interface ThreadGroup {
  label: string;
  threads: ThreadItem[];
}

export interface ThreadListProps {
  groups: ThreadGroup[];
  onSelect?: (threadId: string) => void;
}

interface GroupPanelProps {
  group: ThreadGroup;
  onSelect?: (threadId: string) => void;
}

const GroupPanel: React.FC<GroupPanelProps> = ({ group, onSelect }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className={styles.groupLabel}>{group.label}</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <ul className={styles.threadItems} role="list">
          {group.threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                className={`${styles.threadItem} ${thread.active ? styles.active : ''}`}
                onClick={() => onSelect?.(thread.id)}
                title={thread.title}
              >
                <span className={`${styles.dot} ${thread.active ? styles.dotActive : ''}`} />
                <span className={styles.threadTitle}>{thread.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ThreadList: React.FC<ThreadListProps> = ({ groups, onSelect }) => {
  return (
    <div className={styles.threadList}>
      {groups.map((group) => (
        <GroupPanel key={group.label} group={group} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default ThreadList;
