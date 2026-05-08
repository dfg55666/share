// Port of `tuitoweb/src/bottom_pane/slash_commands.rs`.
//
// Shared helpers for filtering and matching built-in slash commands.

import { builtInSlashCommands, parseSlashCommand, type SlashCommand } from "./slash_command";

export type BuiltinCommandFlags = {
  collaborationModesEnabled: boolean;
  connectorsEnabled: boolean;
  pluginsCommandEnabled: boolean;
  fastCommandEnabled: boolean;
  personalityCommandEnabled: boolean;
  realtimeConversationEnabled: boolean;
  audioDeviceSelectionEnabled: boolean;
  allowElevateSandbox: boolean;
};

export function defaultBuiltinCommandFlags(): BuiltinCommandFlags {
  return {
    collaborationModesEnabled: false,
    connectorsEnabled: false,
    pluginsCommandEnabled: false,
    fastCommandEnabled: false,
    personalityCommandEnabled: false,
    realtimeConversationEnabled: false,
    audioDeviceSelectionEnabled: false,
    allowElevateSandbox: false,
  };
}

function fuzzyMatch(candidate: string, query: string): number | null {
  // Minimal fuzzy matcher: case-insensitive subsequence match.
  const c = candidate.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;

  let score = 0;
  let i = 0;
  for (let j = 0; j < c.length && i < q.length; j += 1) {
    if (c[j] === q[i]) {
      score += 1;
      i += 1;
    }
  }
  return i === q.length ? score : null;
}

export function builtinsForInput(flags: BuiltinCommandFlags): Array<[string, SlashCommand]> {
  return builtInSlashCommands()
    .filter(([, cmd]) => flags.allowElevateSandbox || cmd !== "setup-default-sandbox")
    .filter(([, cmd]) =>
      flags.collaborationModesEnabled ? true : cmd !== "collab" && cmd !== "plan",
    )
    .filter(([, cmd]) => (flags.connectorsEnabled ? true : cmd !== "apps"))
    .filter(([, cmd]) => (flags.pluginsCommandEnabled ? true : cmd !== "plugins"))
    .filter(([, cmd]) => (flags.fastCommandEnabled ? true : cmd !== "fast"))
    .filter(([, cmd]) => (flags.personalityCommandEnabled ? true : cmd !== "personality"))
    .filter(([, cmd]) => (flags.realtimeConversationEnabled ? true : cmd !== "realtime"))
    .filter(([, cmd]) => (flags.audioDeviceSelectionEnabled ? true : cmd !== "settings"));
}

export function findBuiltinCommand(name: string, flags: BuiltinCommandFlags): SlashCommand | null {
  const cmd = parseSlashCommand(name);
  if (!cmd) return null;
  return builtinsForInput(flags).some(([, visible]) => visible === cmd) ? cmd : null;
}

export function hasBuiltinPrefix(name: string, flags: BuiltinCommandFlags): boolean {
  return builtinsForInput(flags).some(([commandName]) => fuzzyMatch(commandName, name) !== null);
}
