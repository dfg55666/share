import React from 'react';
import styles from './SettingRow.module.scss';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  /** If true, control sits below text instead of to the right */
  vertical?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  children,
  vertical = false,
}) => {
  return (
    <div className={`${styles.row} ${vertical ? styles.vertical : ''}`}>
      <div className={styles.textBlock}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
};

export default SettingRow;
