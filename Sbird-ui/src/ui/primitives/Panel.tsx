import React from 'react';
import styles from './Panel.module.scss';

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ children, className }) => {
  const classes = [styles.panel, className ?? ''].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
};

export default Panel;
