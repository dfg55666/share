import React, { useState } from 'react';
import { Search } from 'lucide-react';
import SettingSection from '../components/SettingSection';
import styles from './ShortcutsPage.module.scss';

interface ShortcutEntry {
  label: string;
  keys: string[];
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '通用',
    shortcuts: [
      { label: '全局搜索', keys: ['⌘', 'K'] },
      { label: '打开设置', keys: ['⌘', ','] },
      { label: '切换侧边栏', keys: ['⌘', 'B'] },
      { label: '切换右侧面板', keys: ['⌘', '.'] },
      { label: '关闭弹窗 / 取消', keys: ['Esc'] },
      { label: '全屏切换', keys: ['F11'] },
    ],
  },
  {
    title: '对话',
    shortcuts: [
      { label: '发送消息', keys: ['Enter'] },
      { label: '换行', keys: ['Shift', 'Enter'] },
      { label: '中断当前回复', keys: ['⌘', 'Shift', 'S'] },
      { label: '回滚上一轮', keys: ['⌘', 'Z'] },
      { label: '聚焦输入框', keys: ['⌘', 'L'] },
      { label: '清空输入', keys: ['⌘', 'Shift', 'Backspace'] },
    ],
  },
  {
    title: '导航',
    shortcuts: [
      { label: '上一个线程', keys: ['⌘', '↑'] },
      { label: '下一个线程', keys: ['⌘', '↓'] },
      { label: '跳转到第 N 个线程', keys: ['⌘', '1-9'] },
      { label: '滚动到顶部', keys: ['Home'] },
      { label: '滚动到底部', keys: ['End'] },
    ],
  },
  {
    title: '编辑',
    shortcuts: [
      { label: '复制选中内容', keys: ['⌘', 'C'] },
      { label: '复制代码块', keys: ['⌘', 'Shift', 'C'] },
      { label: '全选', keys: ['⌘', 'A'] },
    ],
  },
];

const ShortcutsPage: React.FC = () => {
  const [filter, setFilter] = useState('');

  const filteredGroups = SHORTCUT_GROUPS.map((group) => ({
    ...group,
    shortcuts: group.shortcuts.filter((s) =>
      s.label.toLowerCase().includes(filter.toLowerCase()),
    ),
  })).filter((group) => group.shortcuts.length > 0);

  return (
    <>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索快捷键..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filteredGroups.map((group) => (
        <SettingSection key={group.title} title={group.title}>
          <div className={styles.shortcutList}>
            {group.shortcuts.map((shortcut) => (
              <div key={shortcut.label} className={styles.shortcutRow}>
                <span className={styles.shortcutLabel}>{shortcut.label}</span>
                <div className={styles.shortcutKeys}>
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className={styles.keyPlus}>+</span>}
                      <kbd className={styles.kbd}>{key}</kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingSection>
      ))}

      {filteredGroups.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>没有匹配的快捷键</span>
        </div>
      )}

      <div className={styles.footnote}>
        <p>在 macOS 上使用 ⌘ (Command)，在 Windows/Linux 上使用 Ctrl</p>
      </div>
    </>
  );
};

export default ShortcutsPage;
