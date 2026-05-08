import React from 'react';
import { Plus, Users } from 'lucide-react';
import Avatar from '../../../ui/primitives/Avatar';
import IconButton from '../../../ui/primitives/IconButton';
import styles from './SubjectList.module.scss';

export interface Subject {
  id: string;
  name: string;
  initial: string;
  color: 'purple' | 'green' | 'blue';
}

export interface SubjectListProps {
  subjects: Subject[];
  onAdd?: () => void;
  onSelect?: (subjectId: string) => void;
  addDisabled?: boolean;
}

const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  onAdd,
  onSelect,
  addDisabled = false,
}) => {
  return (
    <div className={styles.subjectList}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Users size={14} className={styles.headerIcon} />
          <span className={styles.title}>命主列表</span>
        </div>
        <IconButton
          icon={<Plus size={14} />}
          onClick={onAdd}
          title="添加命主"
          size="sm"
          className={styles.addButton}
          disabled={addDisabled}
        />
      </div>

      <ul className={styles.items} role="list">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <button
              type="button"
              className={styles.subjectItem}
              onClick={() => onSelect?.(subject.id)}
              title={subject.name}
            >
              <Avatar
                fallback={subject.initial}
                color={subject.color}
                size="sm"
              />
              <span className={styles.subjectName}>{subject.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubjectList;
