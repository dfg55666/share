import { X, File } from 'lucide-react';
import styles from './FilePreviewBar.module.scss';

export interface SelectedFile {
  id: string;
  name: string;
  size: number;
}

interface FilePreviewBarProps {
  files: SelectedFile[];
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function FilePreviewBar({ files, onRemove }: FilePreviewBarProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.bar}>
      {files.map((file) => (
        <div key={file.id} className={styles.chip}>
          <File size={12} className={styles.fileIcon} />
          <span className={styles.fileName}>{file.name}</span>
          <span className={styles.fileSize}>{formatSize(file.size)}</span>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(file.id)}
            aria-label={`移除 ${file.name}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
