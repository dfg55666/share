import React, { useEffect, useRef } from 'react';
import {
  Home,
  Bot,
  Workflow,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Settings,
  Phone,
  ChevronDown,
  Plus,
  LucideProps,
} from 'lucide-react';
import Avatar from '../../../ui/primitives/Avatar';
import IconButton from '../../../ui/primitives/IconButton';
import ThreadList, { ThreadGroup } from './ThreadList';
import SubjectList, { Subject } from './SubjectList';
import styles from './WorkbenchSidebar.module.scss';

// ------------------------------------------------------------------
// Icon lookup map: string name → Lucide component
// ------------------------------------------------------------------
type LucideComponent = React.FC<LucideProps>;

const ICON_MAP: Record<string, LucideComponent> = {
  home: Home,
  bot: Bot,
  workflow: Workflow,
  'book-open': BookOpen,
};

// ------------------------------------------------------------------
// Interfaces
// ------------------------------------------------------------------
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
}

export interface UserInfo {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface WorkbenchSidebarProps {
  navItems: NavItem[];
  threadGroups: ThreadGroup[];
  subjects: Subject[];
  user: UserInfo;
  collapsed?: boolean;
  onNavSelect?: (navId: string) => void;
  onThreadSelect?: (threadId: string) => void;
  onSubjectAdd?: () => void;
  onSubjectSelect?: (subjectId: string) => void;
  onCollapse?: () => void;
  onSearch?: (query: string) => void;
  onSettingsClick?: () => void;
  collapseDisabled?: boolean;
  subjectActionsDisabled?: boolean;
  settingsDisabled?: boolean;
  contactDisabled?: boolean;
}

// ------------------------------------------------------------------
// Logo SVG
// ------------------------------------------------------------------
const SbirdLogo: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M8 4L16 8L24 4L28 12L24 20L16 28L8 20L4 12L8 4Z"
      fill="#7C5CFC"
      stroke="#7C5CFC"
      strokeWidth="1"
    />
    <path d="M12 8L16 10L20 8L22 14L16 20L10 14L12 8Z" fill="#A78BFA" />
  </svg>
);

// ------------------------------------------------------------------
// WorkbenchSidebar
// ------------------------------------------------------------------
const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({
  navItems,
  threadGroups,
  subjects,
  user,
  collapsed = false,
  onNavSelect,
  onThreadSelect,
  onSubjectAdd,
  onSubjectSelect,
  onCollapse,
  onSearch,
  onSettingsClick,
  collapseDisabled = false,
  subjectActionsDisabled = false,
  settingsDisabled = false,
  contactDisabled = false,
}) => {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {/* ── Top: Logo + Collapse ── */}
      <div className={styles.logoRow}>
        <div className={styles.logoMark}>
          <SbirdLogo />
          {!collapsed && <span className={styles.logoText}>Sbird魔鸟</span>}
        </div>
        <IconButton
          icon={collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          onClick={onCollapse}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          size="sm"
          disabled={collapseDisabled}
        />
      </div>

      {!collapsed && (
        <>
          {/* ── Search Box ── */}
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={searchRef}
              type="text"
              placeholder="搜索..."
              className={styles.searchInput}
              onChange={handleSearchChange}
              aria-label="搜索"
            />
            <span className={styles.searchShortcut}>⌘K</span>
          </div>

          {/* ── Scrollable inner content ── */}
          <div className={styles.scrollArea}>
            {/* ── Nav Items ── */}
            <nav className={styles.nav} aria-label="主导航">
              <ul className={styles.navList} role="list">
                {navItems.map((item) => {
                  const IconComponent = ICON_MAP[item.icon];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
                        onClick={() => onNavSelect?.(item.id)}
                        aria-current={item.active ? 'page' : undefined}
                        disabled={item.disabled}
                      >
                        {IconComponent && (
                          <IconComponent
                            size={16}
                            className={styles.navIcon}
                          />
                        )}
                        <span className={styles.navLabel}>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* ── Divider ── */}
            <div className={styles.divider} />

            {/* ── Thread History ── */}
            <section aria-label="历史会话">
              <div className={styles.sectionTitle}>历史会话</div>
              <ThreadList groups={threadGroups} onSelect={onThreadSelect} />
            </section>

            {/* ── Divider ── */}
            <div className={styles.divider} />

            {/* ── Subject List ── */}
            <section aria-label="命主列表">
              <SubjectList
                subjects={subjects}
                onAdd={onSubjectAdd}
                onSelect={onSubjectSelect}
                addDisabled={subjectActionsDisabled}
              />
            </section>
          </div>
        </>
      )}

      {/* ── Bottom User Area ── */}
      <div className={styles.userArea}>
        <Avatar
          src={user.avatarUrl}
          fallback={user.name.charAt(0)}
          size="md"
          color="purple"
        />
        {!collapsed && (
          <>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
            <div className={styles.userActions}>
              <IconButton
                icon={<Settings size={14} />}
                title="设置"
                size="sm"
                onClick={onSettingsClick}
                disabled={settingsDisabled}
              />
              <IconButton
                icon={<Phone size={14} />}
                title="联系我们"
                size="sm"
                disabled={contactDisabled}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default WorkbenchSidebar;
