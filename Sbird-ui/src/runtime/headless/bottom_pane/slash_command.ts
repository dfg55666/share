// Port of `tuitoweb/src/slash_command.rs` (built-in slash command vocabulary).

// Presentation order matters (mirrors Rust enum order).
export const SLASH_COMMANDS = [
  "model",
  "fast",
  "approvals",
  "permissions",
  "setup-default-sandbox",
  "sandbox-add-read-dir",
  "experimental",
  "skills",
  "review",
  "rename",
  "new",
  "resume",
  "fork",
  "init",
  "compact",
  "plan",
  "collab",
  "agent",
  "diff",
  "copy",
  "mention",
  "status",
  "debug-config",
  "title",
  "statusline",
  "theme",
  "mcp",
  "apps",
  "plugins",
  "logout",
  "quit",
  "exit",
  "feedback",
  "rollout",
  "ps",
  "stop",
  "clear",
  "personality",
  "realtime",
  "settings",
  "test-approval",
  "subagents",
  "debug-m-drop",
  "debug-m-update",
] as const;

export type SlashCommand = (typeof SLASH_COMMANDS)[number];

const CLEAN_ALIAS = "clean";
const STOP_CANONICAL = "stop";

export function parseSlashCommand(name: string): SlashCommand | null {
  const normalized = name.trim().replace(/^\//, "").toLowerCase();
  const canonical = normalized === CLEAN_ALIAS ? STOP_CANONICAL : normalized;
  return (SLASH_COMMANDS as readonly string[]).includes(canonical) ? (canonical as SlashCommand) : null;
}

export function description(cmd: SlashCommand): string {
  switch (cmd) {
    case "feedback":
      return "send logs to maintainers";
    case "new":
      return "start a new chat during a conversation";
    case "init":
      return "create an AGENTS.md file with instructions for Codex";
    case "compact":
      return "summarize conversation to prevent hitting the context limit";
    case "review":
      return "review my current changes and find issues";
    case "rename":
      return "rename the current thread";
    case "resume":
      return "resume a saved chat";
    case "clear":
      return "clear the terminal and start a new chat";
    case "fork":
      return "fork the current chat";
    case "quit":
    case "exit":
      return "exit Codex";
    case "diff":
      return "show git diff (including untracked files)";
    case "copy":
      return "copy the latest Codex output to your clipboard";
    case "mention":
      return "mention a file";
    case "skills":
      return "use skills to improve how Codex performs specific tasks";
    case "status":
      return "show current session configuration and token usage";
    case "debug-config":
      return "show config layers and requirement sources for debugging";
    case "title":
      return "configure which items appear in the terminal title";
    case "statusline":
      return "configure which items appear in the status line";
    case "theme":
      return "choose a syntax highlighting theme";
    case "ps":
      return "list background terminals";
    case "stop":
      return "stop all background terminals";
    case "debug-m-drop":
    case "debug-m-update":
      return "DO NOT USE";
    case "model":
      return "choose what model and reasoning effort to use";
    case "fast":
      return "toggle Fast mode to enable fastest inference at 2X plan usage";
    case "personality":
      return "choose a communication style for Codex";
    case "realtime":
      return "toggle realtime voice mode (experimental)";
    case "settings":
      return "configure realtime microphone/speaker";
    case "plan":
      return "switch to Plan mode";
    case "collab":
      return "change collaboration mode (experimental)";
    case "agent":
    case "subagents":
      return "switch the active agent thread";
    case "approvals":
    case "permissions":
      return "choose what Codex is allowed to do";
    case "setup-default-sandbox":
      return "set up elevated agent sandbox";
    case "sandbox-add-read-dir":
      return "let sandbox read a directory: /sandbox-add-read-dir <absolute_path>";
    case "experimental":
      return "toggle experimental features";
    case "mcp":
      return "list configured MCP tools";
    case "apps":
      return "manage apps";
    case "plugins":
      return "browse plugins";
    case "logout":
      return "log out of Codex";
    case "rollout":
      return "print the rollout file path";
    case "test-approval":
      return "test approval request";
  }
}

export function supportsInlineArgs(cmd: SlashCommand): boolean {
  return cmd === "review" || cmd === "rename" || cmd === "plan" || cmd === "fast" || cmd === "sandbox-add-read-dir";
}

export function availableDuringTask(cmd: SlashCommand): boolean {
  switch (cmd) {
    case "new":
    case "resume":
    case "fork":
    case "init":
    case "compact":
    case "model":
    case "fast":
    case "personality":
    case "approvals":
    case "permissions":
    case "setup-default-sandbox":
    case "sandbox-add-read-dir":
    case "experimental":
    case "review":
    case "plan":
    case "clear":
    case "logout":
    case "debug-m-drop":
    case "debug-m-update":
      return false;
    default:
      return true;
  }
}

export function builtInSlashCommands(): Array<[string, SlashCommand]> {
  return SLASH_COMMANDS.map((name) => [name, name]);
}
