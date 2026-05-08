import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { Paperclip, AtSign, Mic } from 'lucide-react';
import MentionPopup, { MentionOption } from './MentionPopup';
import FilePreviewBar, { SelectedFile } from './FilePreviewBar';
import styles from './ChatComposerPanel.module.scss';

const DEFAULT_MENTION_OPTIONS: MentionOption[] = [
  { id: 'yinzhan-agent', label: '印占 Agent', description: '印度占星分析', icon: 'agent' },
  { id: 'liuyao-agent', label: '六爻 Agent', description: '六爻卦象解读', icon: 'agent' },
  { id: 'search-tool', label: '搜索工具', description: '联网搜索', icon: 'tool' },
  { id: 'calc-tool', label: '计算工具', description: '数值计算', icon: 'tool' },
];

interface ChatComposerPanelProps {
  value?: string;
  placeholder?: string;
  onSend?: (text: string) => void;
  onChange?: (text: string) => void;
  disabled?: boolean;
  sendDisabled?: boolean;
  mentionOptions?: MentionOption[];
}

const SendIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </svg>
);

export default function ChatComposerPanel({
  value,
  placeholder = '向多 Agents 提问或输入 @ 调用联系人 / 工具',
  onSend,
  onChange,
  disabled = false,
  sendDisabled = disabled,
  mentionOptions,
}: ChatComposerPanelProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // File state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const currentValue = isControlled ? value : internalValue;

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const computed = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 21;
    const maxHeight = lineHeight * 5;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [currentValue, resizeTextarea]);

  const handleChange = (text: string) => {
    if (!isControlled) {
      setInternalValue(text);
    }
    onChange?.(text);

    // Detect @ trigger
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const afterAt = text.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionOpen(true);
        setMentionQuery(afterAt);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery('');
  };

  const handleMentionSelect = (option: MentionOption) => {
    const lastAtIndex = currentValue.lastIndexOf('@');
    const before = currentValue.slice(0, lastAtIndex);
    const newValue = `${before}@${option.label} `;
    handleChange(newValue);
    setMentionOpen(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const trimmed = currentValue.trim();
    if (!trimmed || disabled || sendDisabled) return;
    onSend?.(trimmed);
    if (!isControlled) {
      setInternalValue('');
    }
    setSelectedFiles([]);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: SelectedFile[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}`,
      name: f.name,
      size: f.size,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleFileRemove = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={styles.composer}>
      <div
        className={`${styles.inputBox} ${disabled ? styles.inputBoxDisabled : ''}`}
      >
        {/* Mention popup */}
        {mentionOpen && (
          <MentionPopup
            options={mentionOptions ?? DEFAULT_MENTION_OPTIONS}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionOpen(false)}
          />
        )}

        {/* File preview */}
        <FilePreviewBar files={selectedFiles} onRemove={handleFileRemove} />

        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow popup click
            setTimeout(() => setMentionOpen(false), 150);
          }}
          aria-label="消息输入框"
        />

        <div className={styles.toolbar}>
          {/* Left action buttons */}
          <div className={styles.leftActions}>
            <button
              className={styles.iconBtn}
              aria-label="附件"
              type="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
            <button
              className={styles.iconBtn}
              aria-label="提及"
              type="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                const newValue = currentValue + '@';
                handleChange(newValue);
                inputRef.current?.focus();
              }}
            >
              <AtSign size={16} />
            </button>
          </div>

          {/* Right action buttons */}
          <div className={styles.rightActions}>
            <button
              className={styles.iconBtn}
              aria-label="语音输入"
              type="button"
              tabIndex={disabled ? -1 : 0}
            >
              <Mic size={16} />
            </button>
            <button
              className={styles.sendBtn}
              aria-label="发送"
              type="button"
              disabled={disabled || sendDisabled || !currentValue.trim()}
              onClick={handleSend}
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
