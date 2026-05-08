import React, { useState, useRef, useCallback } from 'react';
import styles from './SidebarTooltip.module.scss';

interface SidebarTooltipProps {
  text: string;
  position?: 'right' | 'top';
  children: React.ReactElement;
}

/**
 * Lightweight tooltip for collapsed sidebar icons.
 * Appears on hover with a short delay.
 */
const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  text,
  position = 'right',
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className={`${styles.tooltip} ${styles[position]}`}
          role="tooltip"
        >
          {text}
          <span className={styles.arrow} />
        </div>
      )}
    </div>
  );
};

export default SidebarTooltip;
