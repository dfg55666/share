import React, { useState } from 'react';
import SettingSection from '../components/SettingSection';
import SettingRow from '../components/SettingRow';
import ToggleSwitch from '../components/ToggleSwitch';
import SelectField from '../components/SelectField';
import styles from './ModelPage.module.scss';

const MODEL_OPTIONS = [
  { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet', description: '均衡性能，推荐日常使用' },
  { value: 'claude-4-opus', label: 'Claude 4 Opus', description: '最强推理能力，复杂任务首选' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'OpenAI 旗舰模型' },
  { value: 'deepseek-r1', label: 'DeepSeek R1', description: '高性价比推理模型' },
];

const EFFORT_OPTIONS = [
  { value: 'low', label: '低', description: '快速响应，节省成本' },
  { value: 'medium', label: '中', description: '平衡速度与质量' },
  { value: 'high', label: '高', description: '深度思考，最佳质量' },
];

const TEMPERATURE_PRESETS = [
  { value: '0', label: '精确 (0.0)' },
  { value: '0.3', label: '低随机 (0.3)' },
  { value: '0.7', label: '平衡 (0.7)' },
  { value: '1.0', label: '高创意 (1.0)' },
];

const GeneralPage: React.FC = () => {
  const [model, setModel] = useState('claude-4-sonnet');
  const [effort, setEffort] = useState('medium');
  const [temperature, setTemperature] = useState('0.7');
  const [streaming, setStreaming] = useState(true);
  const [thinking, setThinking] = useState(true);
  const [apiKey, setApiKey] = useState('');

  return (
    <>
      <SettingSection title="模型选择" description="选择 AI 推理引擎使用的基础模型">
        <SettingRow label="默认模型" vertical>
          <SelectField
            options={MODEL_OPTIONS}
            value={model}
            onChange={setModel}
          />
        </SettingRow>
        <SettingRow label="推理力度" description="控制模型思考深度与 Token 消耗">
          <SelectField
            options={EFFORT_OPTIONS}
            value={effort}
            onChange={setEffort}
          />
        </SettingRow>
        <SettingRow label="温度 (Temperature)" description="数值越高输出越具创造性">
          <SelectField
            options={TEMPERATURE_PRESETS}
            value={temperature}
            onChange={setTemperature}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="输出控制" description="控制模型输出行为">
        <SettingRow label="流式输出" description="实时逐字显示模型回复">
          <ToggleSwitch checked={streaming} onChange={setStreaming} />
        </SettingRow>
        <SettingRow label="显示思考过程" description="展开模型的推理步骤">
          <ToggleSwitch checked={thinking} onChange={setThinking} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="API 密钥" description="配置自定义模型提供商的 API Key（可选）">
        <SettingRow label="API Key" description="留空则使用系统默认配置" vertical>
          <div className={styles.apiKeyRow}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={styles.apiKeyInput}
              autoComplete="off"
            />
          </div>
        </SettingRow>
      </SettingSection>
    </>
  );
};

export default GeneralPage;
