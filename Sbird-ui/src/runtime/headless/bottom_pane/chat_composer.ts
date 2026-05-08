// Web Phase 1 port of `tuitoweb/src/bottom_pane/chat_composer.rs`.
//
// The Rust TUI composer is a full key-driven state machine (textarea + elements + popups).
// In the browser, DOM inputs already implement editing. We keep the same high-level responsibilities:
// - hold draft text
// - parse slash commands at submit time
// - produce a structured InputResult so the parent runtime can dispatch actions 1:1

import { parseSlashCommand, supportsInlineArgs, type SlashCommand } from "./slash_command";

export type InputResult =
  | { kind: "Submitted"; text: string }
  | { kind: "Queued"; text: string }
  | { kind: "Command"; command: SlashCommand }
  | { kind: "CommandWithArgs"; command: SlashCommand; args: string }
  | { kind: "None" };

export type ChatComposerConfig = {
  popupsEnabled: boolean;
  slashCommandsEnabled: boolean;
  imagePasteEnabled: boolean;
};

export function defaultChatComposerConfig(): ChatComposerConfig {
  return {
    popupsEnabled: true,
    slashCommandsEnabled: true,
    imagePasteEnabled: true,
  };
}

export class ChatComposer {
  private text = "";
  private placeholderText = "";
  private config: ChatComposerConfig = defaultChatComposerConfig();

  // Used by UI to show custom key hints. Web will render buttons instead.
  private footerHintOverride: Array<[string, string]> | null = null;

  constructor(placeholderText: string) {
    this.placeholderText = placeholderText;
  }

  setConfig(config: Partial<ChatComposerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setPlaceholder(text: string): void {
    this.placeholderText = text;
  }

  placeholder(): string {
    return this.placeholderText;
  }

  isEmpty(): boolean {
    return this.text.length === 0;
  }

  getText(): string {
    return this.text;
  }

  setTextContent(text: string): void {
    this.text = text ?? "";
  }

  setFooterHintOverride(items: Array<[string, string]> | null): void {
    this.footerHintOverride = items;
  }

  footerHintOverrideItems(): Array<[string, string]> | null {
    return this.footerHintOverride;
  }

  // High-level submit entry point used by the bottom pane / UI.
  submit(mode: "steer" | "queue"): InputResult {
    const raw = this.text;
    const trimmed = raw.trim();
    if (!trimmed) {
      return { kind: "None" };
    }

    // Slash commands are parsed from the raw prefix, not from trimmed content.
    if (this.config.slashCommandsEnabled && raw.startsWith("/")) {
      const parsedName = raw.slice(1).trim().split(/\s+/)[0] ?? "";
      const command = parseSlashCommand(parsedName);
      if (command) {
        if (supportsInlineArgs(command)) {
          const args = raw.slice(1 + parsedName.length).trim();
          this.clearDraftPreservingKillBuffer();
          return args ? { kind: "CommandWithArgs", command, args } : { kind: "Command", command };
        }
        this.clearDraftPreservingKillBuffer();
        return { kind: "Command", command };
      }
    }

    this.clearDraftPreservingKillBuffer();
    return mode === "queue" ? { kind: "Queued", text: trimmed } : { kind: "Submitted", text: trimmed };
  }

  clearDraftPreservingKillBuffer(): void {
    // The Rust version preserves the kill buffer. In the browser we don't model a kill ring yet,
    // but we keep this method boundary for future parity.
    this.text = "";
  }
}
