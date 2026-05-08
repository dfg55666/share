import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import SettingsNav, { type SettingsPageId } from './SettingsNav';
import GeneralPage from './pages/GeneralPage';
import ModelPage from './pages/ModelPage';
import ConnectionPage from './pages/ConnectionPage';
import AppearancePage from './pages/AppearancePage';
import ShortcutsPage from './pages/ShortcutsPage';
import AboutPage from './pages/AboutPage';
import styles from './SettingsPanel.module.scss';

const PAGE_TITLES: Record<SettingsPageId, string> = {
  general: '通用设置',
  model: '模型配置',
  connection: '引擎连接',
  appearance: '外观主题',
  shortcuts: '快捷键',
  about: '关于 Sbird',
};

const PAGE_DESCRIPTIONS: Record<SettingsPageId, string> = {
  general: '语言、通知、数据管理',
  model: 'AI 模型选择与参数调整',
  connection: '引擎状态与连接行为',
  appearance: '主题、配色、字体、布局',
  shortcuts: '查看所有键盘快捷键',
  about: '版本信息与技术栈',
};

const PAGE_COMPONENTS: Record<SettingsPageId, React.FC> = {
  general: GeneralPage,
  model: ModelPage,
  connection: ConnectionPage,
  appearance: AppearancePage,
  shortcuts: ShortcutsPage,
  about: AboutPage,
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  initialPage?: SettingsPageId;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  initialPage = 'general',
}) => {
  const [activePage, setActivePage] = useState<SettingsPageId>(initialPage);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset page when re-opened
  useEffect(() => {
    if (open) {
      setActivePage(initialPage);
      setClosing(false);
    }
  }, [open, initialPage]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!open && !closing) return null;

  const PageComponent = PAGE_COMPONENTS[activePage];

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="设置"
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${closing ? styles.panelClosing : ''}`}
      >
        {/* Left: Navigation */}
        <SettingsNav activePage={activePage} onPageChange={setActivePage} />

        {/* Right: Content */}
        <div className={styles.content}>
          {/* Content Header */}
          <div className={styles.contentHeader}>
            <div className={styles.contentHeaderText}>
              <h2 className={styles.contentTitle}>{PAGE_TITLES[activePage]}</h2>
              <p className={styles.contentDescription}>{PAGE_DESCRIPTIONS[activePage]}</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleClose}
              aria-label="关闭设置"
            >
              <X size={18} />
            </button>
          </div>

          {/* Page Content */}
          <div className={styles.contentBody} key={activePage}>
            <PageComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
