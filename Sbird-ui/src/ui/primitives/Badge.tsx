import React from 'react';
import styles from './Badge.module.scss';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'muted';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
};

export default Badge;
