import styles from './WorkbenchShell.module.scss';

interface WorkbenchShellProps {
  sidebar: React.ReactNode;
  chat: React.ReactNode;
  panel?: React.ReactNode;
  sidebarCollapsed?: boolean;
}

/**
 * Three-column floating-card workbench layout.
 * Pure layout shell — no business state.
 */
export default function WorkbenchShell({
  sidebar,
  chat,
  panel,
  sidebarCollapsed = false,
}: WorkbenchShellProps) {
  return (
    <div className={styles.shell}>
      <div className={`${styles.sidebarCard} ${sidebarCollapsed ? styles.sidebarCardCollapsed : ''}`}>
        {sidebar}
      </div>
      <div className={styles.chatCard}>{chat}</div>
      {panel && <div className={styles.panelCard}>{panel}</div>}
    </div>
  );
}
