import React from 'react';
import styles from './Avatar.module.scss';

export interface AvatarProps {
  src?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'green' | 'blue' | 'default';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  fallback = '?',
  size = 'md',
  color = 'default',
  className,
}) => {
  const sizeClass = styles[size];
  const colorClass = styles[color];

  const classes = [
    styles.avatar,
    sizeClass,
    !src ? colorClass : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return (
      <img
        src={src}
        alt={fallback}
        className={classes}
      />
    );
  }

  return (
    <div className={classes} aria-label={fallback}>
      <span className={styles.fallback}>{fallback}</span>
    </div>
  );
};

export default Avatar;
