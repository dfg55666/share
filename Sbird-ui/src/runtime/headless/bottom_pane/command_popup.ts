// Web Phase 1 port of `tuitoweb/src/bottom_pane/command_popup.rs`.
//
// The Rust implementation renders a popup listing built-in slash commands with filtering
// driven by the current composer text. Web Phase 1 keeps the same filtering/selection logic
// and leaves rendering to React.

import { description, type SlashCommand } from "./slash_command";
import { builtinsForInput, type BuiltinCommandFlags } from "./slash_commands";
import { ScrollState } from "./scroll_state";

// Hide alias commands in the default popup list so each unique action appears once.
const ALIAS_COMMANDS = new Set<SlashCommand>(["quit", "approvals"]);

export type CommandItem = { kind: "Builtin"; command: SlashCommand };

export type CommandPopupFlags = {
  collaborationModesEnabled: boolean;
  connectorsEnabled: boolean;
  pluginsCommandEnabled: boolean;
  fastCommandEnabled: boolean;
  personalityCommandEnabled: boolean;
  realtimeConversationEnabled: boolean;
  audioDeviceSelectionEnabled: boolean;
  windowsDegradedSandboxActive: boolean;
};

function toBuiltinFlags(flags: CommandPopupFlags): BuiltinCommandFlags {
  return {
    collaborationModesEnabled: flags.collaborationModesEnabled,
    connectorsEnabled: flags.connectorsEnabled,
    pluginsCommandEnabled: flags.pluginsCommandEnabled,
    fastCommandEnabled: flags.fastCommandEnabled,
    personalityCommandEnabled: flags.personalityCommandEnabled,
    realtimeConversationEnabled: flags.realtimeConversationEnabled,
    audioDeviceSelectionEnabled: flags.audioDeviceSelectionEnabled,
    allowElevateSandbox: flags.windowsDegradedSandboxActive,
  };
}

export type CommandPopupRow = {
  name: string;
  description: string;
  matchIndices?: number[] | null;
};

export class CommandPopup {
  private commandFilter = "";
  private readonly builtins: Array<[string, SlashCommand]>;
  private readonly state = new ScrollState();

  constructor(flags: CommandPopupFlags) {
    // Keep built-in availability in sync with the composer.
    this.builtins = builtinsForInput(toBuiltinFlags(flags))
      .filter(([name]) => !name.startsWith("debug"))
      .filter(([, cmd]) => cmd !== "apps")
      .filter(([, cmd]) => !ALIAS_COMMANDS.has(cmd));
  }

  onComposerTextChange(text: string): void {
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    if (firstLine.startsWith("/")) {
      const stripped = firstLine.slice(1).trimStart();
      const token = stripped.split(/\s+/)[0] ?? "";
      this.commandFilter = token;
    } else {
      this.commandFilter = "";
    }

    // Clamp selected index.
    const len = this.filteredItems().length;
    this.state.setSelectedIndex(Math.min(this.state.selectedIndex(), Math.max(0, len - 1)));
  }

  filteredItems(): CommandItem[] {
    return this.filtered().map(([item]) => item);
  }

  filtered(): Array<[CommandItem, number[] | null]> {
    const filter = this.commandFilter.trim();
    const out: Array<[CommandItem, number[] | null]> = [];

    if (!filter) {
      for (const [, cmd] of this.builtins) {
        out.push([{ kind: "Builtin", command: cmd }, null]);
      }
      return out;
    }

    const filterLower = filter.toLowerCase();
    const exact: Array<[CommandItem, number[] | null]> = [];
    const prefix: Array<[CommandItem, number[] | null]> = [];

    const indicesFor = (offset: number) =>
      Array.from({ length: filter.length }, (_, i) => offset + i);

    for (const [name, cmd] of this.builtins) {
      const display = name;
      const displayLower = display.toLowerCase();
      if (displayLower === filterLower) {
        exact.push([{ kind: "Builtin", command: cmd }, indicesFor(0)]);
      } else if (displayLower.startsWith(filterLower)) {
        prefix.push([{ kind: "Builtin", command: cmd }, indicesFor(0)]);
      }
    }

    out.push(...exact, ...prefix);
    return out;
  }

  rows(): CommandPopupRow[] {
    return this.filtered().map(([item, indices]) => {
      const cmd = item.command;
      return {
        name: `/${cmd}`,
        description: description(cmd),
        matchIndices: indices,
      };
    });
  }

  moveUp(): void {
    const len = this.filteredItems().length;
    if (len <= 0) return;
    const current = this.state.selectedIndex();
    this.state.setSelectedIndex(current <= 0 ? len - 1 : current - 1);
  }

  moveDown(): void {
    const len = this.filteredItems().length;
    if (len <= 0) return;
    const current = this.state.selectedIndex();
    this.state.setSelectedIndex(current >= len - 1 ? 0 : current + 1);
  }

  selectedItem(): CommandItem | null {
    const items = this.filteredItems();
    const idx = this.state.selectedIndex();
    return items[idx] ?? null;
  }

  acceptSelected(): SlashCommand | null {
    const item = this.selectedItem();
    if (!item) return null;
    return item.command;
  }
}
