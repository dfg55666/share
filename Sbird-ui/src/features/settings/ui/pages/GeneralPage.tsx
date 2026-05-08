import React, { useState } from 'react';
import SettingSection from '../components/SettingSection';
import SettingRow from '../components/SettingRow';
import ToggleSwitch from '../components/ToggleSwitch';
import SelectField from '../components/SelectField';

const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: 'UTC+8 中国标准时间' },
  { value: 'Asia/Tokyo', label: 'UTC+9 日本标准时间' },
  { value: 'America/New_York', label: 'UTC-5 美国东部时间' },
  { value: 'Europe/London', label: 'UTC+0 格林尼治标准时间' },
];

const GeneralPage: React.FC = () => {
  const [language, setLanguage] = useState('zh-CN');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  return (
    <>
      <SettingSection title="语言与地区" description="设置界面语言和时区偏好">
        <SettingRow label="界面语言" description="更改后需要刷新页面生效">
          <SelectField
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={setLanguage}
          />
        </SettingRow>
        <SettingRow label="时区" description="影响会话时间戳和日志显示">
          <SelectField
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onChange={setTimezone}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="通知" description="控制消息提醒和声音反馈">
        <SettingRow label="桌面通知" description="在有新消息时显示系统通知">
          <ToggleSwitch checked={notifications} onChange={setNotifications} />
        </SettingRow>
        <SettingRow label="提示音效" description="消息发送和接收时播放声音">
          <ToggleSwitch checked={soundEffects} onChange={setSoundEffects} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="数据" description="会话与数据管理偏好">
        <SettingRow label="自动保存会话" description="自动将对话记录保存到本地缓存">
          <ToggleSwitch checked={autoSave} onChange={setAutoSave} />
        </SettingRow>
        <SettingRow label="使用分析" description="发送匿名使用数据帮助改进产品">
          <ToggleSwitch checked={analytics} onChange={setAnalytics} />
        </SettingRow>
      </SettingSection>
    </>
  );
};

export default GeneralPage;
