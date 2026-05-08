import React, { useState } from 'react';
import { Circle, RefreshCw } from 'lucide-react';
import SettingSection from '../components/SettingSection';
import SettingRow from '../components/SettingRow';
import ToggleSwitch from '../components/ToggleSwitch';
import styles from './ConnectionPage.module.scss';

const ConnectionPage: React.FC = () => {
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // TODO: Replace with real runtime state
  const connectionStatus = 'connected' as 'connected' | 'disconnected' | 'reconnecting';
  const engineUrl = 'http://localhost:8080';
  const latency = '12ms';
  const uptime = '2h 34m';

  const statusLabel = {
    connected: '已连接',
    disconnected: '已断开',
    reconnecting: '重连中...',
  }[connectionStatus];

  const statusColor = {
    connected: styles.statusGreen,
    disconnected: styles.statusRed,
    reconnecting: styles.statusYellow,
  }[connectionStatus];

  return (
    <>
      <SettingSection title="引擎状态" description="当前 Sbird Engine 连接信息">
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div className={styles.statusIndicator}>
              <Circle size={8} className={statusColor} fill="currentColor" />
              <span className={styles.statusText}>{statusLabel}</span>
            </div>
            <button type="button" className={styles.reconnectBtn} title="重新连接">
              <RefreshCw size={14} />
              <span>重连</span>
            </button>
          </div>

          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusItemLabel}>引擎地址</span>
              <span className={styles.statusItemValue}>{engineUrl}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusItemLabel}>延迟</span>
              <span className={styles.statusItemValue}>{latency}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusItemLabel}>在线时长</span>
              <span className={styles.statusItemValue}>{uptime}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusItemLabel}>协议</span>
              <span className={styles.statusItemValue}>SSE</span>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="连接行为" description="控制断线重连和调试选项">
        <SettingRow label="自动重连" description="连接断开后自动尝试重新建立">
          <ToggleSwitch checked={autoReconnect} onChange={setAutoReconnect} />
        </SettingRow>
        <SettingRow label="调试模式" description="在控制台输出详细的 SSE 事件日志">
          <ToggleSwitch checked={debugMode} onChange={setDebugMode} />
        </SettingRow>
      </SettingSection>
    </>
  );
};

export default ConnectionPage;
