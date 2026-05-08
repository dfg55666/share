import React from 'react';
import { X } from 'lucide-react';
import styles from './SettingsModal.module.scss';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>设置</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.settingItem}>
          <span className={styles.settingLabel}>主题</span>
          <span className={styles.settingValue}>深色模式</span>
        </div>
        <div className={styles.settingItem}>
          <span className={styles.settingLabel}>语言</span>
          <span className={styles.settingValue}>简体中文</span>
        </div>
        <div className={styles.settingItem}>
          <span className={styles.settingLabel}>版本</span>
          <span className={styles.settingValue}>Sbird v0.1.0</span>
        </div>
        <div className={styles.settingItem}>
          <span className={styles.settingLabel}>引擎连接</span>
          <span className={styles.settingValue}>已连接</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
