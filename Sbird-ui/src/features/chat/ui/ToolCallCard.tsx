import { FileText, CheckCircle, Loader, XCircle } from 'lucide-react';
import styles from './ToolCallCard.module.scss';

interface ToolCallCardProps {
  label: string;
  name: string;
  status: 'success' | 'loading' | 'error';
}

export default function ToolCallCard({ label, name, status }: ToolCallCardProps) {
  const statusClass =
    status === 'success'
      ? styles.statusSuccess
      : status === 'error'
        ? styles.statusError
        : styles.statusLoading;

  return (
    <div className={styles.card}>
      <div className={styles.iconBox}>
        <FileText size={16} />
      </div>

      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.name}>{name}</span>
      </div>

      <div className={`${styles.statusIcon} ${statusClass}`}>
        {status === 'success' && <CheckCircle size={16} />}
        {status === 'loading' && <Loader size={16} />}
        {status === 'error' && <XCircle size={16} />}
      </div>
    </div>
  );
}
