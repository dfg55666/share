import React from 'react';
import styles from './IconButton.module.scss';

export interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  size = 'md',
  className,
  disabled = false,
}) => {
  const classes = [
    styles.iconButton,
    styles[size],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {icon}
    </button>
  );
};

export default IconButton;
