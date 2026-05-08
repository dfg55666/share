import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import SettingSection from '../components/SettingSection';
import SettingRow from '../components/SettingRow';
import ToggleSwitch from '../components/ToggleSwitch';
import SelectField from '../components/SelectField';
import styles from './AppearancePage.module.scss';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: '浅色', icon: <Sun size={16} /> },
  { value: 'dark', label: '深色', icon: <Moon size={16} /> },
  { value: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
];

const FONT_SIZE_OPTIONS = [
  { value: '12', label: '小 (12px)' },
  { value: '13', label: '默认 (13px)' },
  { value: '14', label: '中 (14px)' },
  { value: '15', label: '大 (15px)' },
  { value: '16', label: '特大 (16px)' },
];

const ACCENT_COLORS = [
  { value: '#7C5CFC', label: '靛紫', className: 'accentPurple' },
  { value: '#3b82f6', label: '海蓝', className: 'accentBlue' },
  { value: '#22c55e', label: '翠绿', className: 'accentGreen' },
  { value: '#f97316', label: '琥珀', className: 'accentOrange' },
  { value: '#ef4444', label: '朱红', className: 'accentRed' },
  { value: '#ec4899', label: '桃粉', className: 'accentPink' },
  { value: '#6366f1', label: '群青', className: 'accentIndigo' },
  { value: '#14b8a6', label: '青碧', className: 'accentTeal' },
];

const CODE_FONT_OPTIONS = [
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'sf-mono', label: 'SF Mono' },
  { value: 'cascadia-code', label: 'Cascadia Code' },
  { value: 'source-code-pro', label: 'Source Code Pro' },
];

const AppearancePage: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [accentColor, setAccentColor] = useState('#7C5CFC');
  const [fontSize, setFontSize] = useState('13');
  const [codeFont, setCodeFont] = useState('fira-code');
  const [compactMode, setCompactMode] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [sidebarPosition, setSidebarPosition] = useState('left');

  return (
    <>
      <SettingSection title="主题模式" description="选择界面的明暗风格">
        <div className={styles.themeCards}>
          {THEME_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={`${styles.themeCard} ${theme === mode.value ? styles.themeCardActive : ''}`}
              onClick={() => setTheme(mode.value)}
            >
              <span className={styles.themeCardIcon}>{mode.icon}</span>
              <span className={styles.themeCardLabel}>{mode.label}</span>
            </button>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="主题色" description="选择界面主色调">
        <div className={styles.accentGrid}>
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              className={`${styles.accentSwatch} ${accentColor === color.value ? styles.accentSwatchActive : ''}`}
              onClick={() => setAccentColor(color.value)}
              title={color.label}
              aria-label={color.label}
            >
              <span
                className={styles.accentDot}
                style={{ backgroundColor: color.value }}
              />
              <span className={styles.accentLabel}>{color.label}</span>
            </button>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="排版" description="调整字体大小和代码字体">
        <SettingRow label="界面字号" description="调整全局界面文字大小">
          <SelectField
            options={FONT_SIZE_OPTIONS}
            value={fontSize}
            onChange={setFontSize}
          />
        </SettingRow>
        <SettingRow label="代码字体" description="代码块和等宽文本使用的字体">
          <SelectField
            options={CODE_FONT_OPTIONS}
            value={codeFont}
            onChange={setCodeFont}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="布局" description="自定义界面显示方式">
        <SettingRow label="紧凑模式" description="缩小间距，在屏幕上显示更多内容">
          <ToggleSwitch checked={compactMode} onChange={setCompactMode} />
        </SettingRow>
        <SettingRow label="侧边栏位置">
          <SelectField
            options={[
              { value: 'left', label: '左侧' },
              { value: 'right', label: '右侧' },
            ]}
            value={sidebarPosition}
            onChange={setSidebarPosition}
          />
        </SettingRow>
        <SettingRow label="显示头像" description="在消息气泡中显示用户和 Agent 头像">
          <ToggleSwitch checked={showAvatars} onChange={setShowAvatars} />
        </SettingRow>
        <SettingRow label="界面动画" description="启用过渡动画和微交互效果">
          <ToggleSwitch checked={animationsEnabled} onChange={setAnimationsEnabled} />
        </SettingRow>
      </SettingSection>
    </>
  );
};

export default AppearancePage;
