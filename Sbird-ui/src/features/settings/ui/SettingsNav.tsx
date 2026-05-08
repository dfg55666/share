import React from 'react';
import {
  Settings,
  Cpu,
  Plug,
  Palette,
  Keyboard,
  Info,
  type LucideIcon,
} from 'lucide-react';
import styles from './SettingsNav.module.scss';

export type SettingsPageId =
  | 'general'
  | 'model'
  | 'connection'
  | 'appearance'
  | 'shortcuts'
  | 'about';

interface NavEntry {
  id: SettingsPageId;
  label: string;
  icon: LucideIcon;
  group?: string;
}

const NAV_ITEMS: NavEntry[] = [
  { id: 'general', label: '通用', icon: Settings, group: '偏好' },
  { id: 'model', label: '模型', icon: Cpu, group: '偏好' },
  { id: 'connection', label: '连接', icon: Plug, group: '偏好' },
  { id: 'appearance', label: '外观', icon: Palette, group: '界面' },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard, group: '界面' },
  { id: 'about', label: '关于', icon: Info, group: '其他' },
];

interface SettingsNavProps {
  activePage: SettingsPageId;
  onPageChange: (page: SettingsPageId) => void;
}

const SettingsNav: React.FC<SettingsNavProps> = ({ activePage, onPageChange }) => {
  // Group items
  const groups: { label: string; items: NavEntry[] }[] = [];
  const groupMap = new Map<string, NavEntry[]>();

  for (const item of NAV_ITEMS) {
    const g = item.group ?? '';
    if (!groupMap.has(g)) {
      groupMap.set(g, []);
      groups.push({ label: g, items: groupMap.get(g)! });
    }
    groupMap.get(g)!.push(item);
  }

  return (
    <nav className={styles.nav} aria-label="设置导航">
      {/* Header */}
      <div className={styles.header}>
        <Settings size={18} className={styles.headerIcon} />
        <span className={styles.headerTitle}>设置</span>
      </div>

      {/* Navigation groups */}
      <div className={styles.groupList}>
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            {group.label && (
              <span className={styles.groupLabel}>{group.label}</span>
            )}
            <ul className={styles.itemList} role="list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
                    onClick={() => onPageChange(item.id)}
                    aria-current={activePage === item.id ? 'page' : undefined}
                  >
                    <item.icon size={16} className={styles.navIcon} />
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className={styles.navFooter}>
        <span className={styles.footerVersion}>Sbird v0.1.0</span>
      </div>
    </nav>
  );
};

export default SettingsNav;
