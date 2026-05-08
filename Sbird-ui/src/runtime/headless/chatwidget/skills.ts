// Port subset of `tuitoweb/src/chatwidget/skills.rs`.
//
// The upstream TUI integrates Codex "skills" (tool mentions, enable/disable) into the composer.
// For the Web Phase 1 runtime we keep mention parsing + data shapes, while deferring the full
// skill catalog/enablement UI until the engine/webserver exposes the same endpoints.

export type SkillMetadata = {
  name: string;
  description?: string;
  shortDescription?: string;
  pathToSkillsMd?: string;
  enabled?: boolean;
};

export type ToolMentions = {
  names: Set<string>;
  linkedPaths: Map<string, string>;
};

const COMMON_ENV_VARS = new Set<string>([
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "PWD",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "TERM",
  "XDG_CONFIG_HOME",
]);

function isMentionNameChar(ch: string | undefined): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  const isLower = code >= 97 && code <= 122;
  const isUpper = code >= 65 && code <= 90;
  const isDigit = code >= 48 && code <= 57;
  return isLower || isUpper || isDigit || ch === "_" || ch === "-";
}

function isCommonEnvVar(name: string): boolean {
  return COMMON_ENV_VARS.has(name.toUpperCase());
}

function isSkillPath(path: string): boolean {
  return (
    !path.startsWith("app://") &&
    !path.startsWith("mcp://") &&
    !path.startsWith("plugin://")
  );
}

function normalizeSkillPath(path: string): string {
  if (path.startsWith("skill://")) {
    return path.slice("skill://".length);
  }
  return path;
}

function parseLinkedToolMention(
  text: string,
  start: number,
  sigil: string,
): { name: string; path: string; endIndex: number } | null {
  const sigilIndex = start + 1;
  if (text[sigilIndex] !== sigil) return null;

  const nameStart = sigilIndex + 1;
  if (!isMentionNameChar(text[nameStart])) return null;

  let nameEnd = nameStart + 1;
  while (isMentionNameChar(text[nameEnd])) {
    nameEnd += 1;
  }
  if (text[nameEnd] !== "]") return null;

  let pathStart = nameEnd + 1;
  while (pathStart < text.length && /\s/.test(text[pathStart] ?? "")) {
    pathStart += 1;
  }
  if (text[pathStart] !== "(") return null;

  let pathEnd = pathStart + 1;
  while (pathEnd < text.length && text[pathEnd] !== ")") {
    pathEnd += 1;
  }
  if (text[pathEnd] !== ")") return null;

  const rawPath = text.slice(pathStart + 1, pathEnd).trim();
  if (!rawPath) return null;

  return {
    name: text.slice(nameStart, nameEnd),
    path: rawPath,
    endIndex: pathEnd + 1,
  };
}

function extractToolMentionsFromTextWithSigil(text: string, sigil: string): ToolMentions {
  const names = new Set<string>();
  const linkedPaths = new Map<string, string>();

  let index = 0;
  while (index < text.length) {
    const ch = text[index];

    if (ch === "[") {
      const linked = parseLinkedToolMention(text, index, sigil);
      if (linked) {
        if (!isCommonEnvVar(linked.name)) {
          if (isSkillPath(linked.path)) {
            names.add(linked.name);
          }
          if (!linkedPaths.has(linked.name)) {
            linkedPaths.set(linked.name, linked.path);
          }
        }
        index = linked.endIndex;
        continue;
      }
    }

    if (ch !== sigil) {
      index += 1;
      continue;
    }

    const nameStart = index + 1;
    if (!isMentionNameChar(text[nameStart])) {
      index += 1;
      continue;
    }

    let nameEnd = nameStart + 1;
    while (isMentionNameChar(text[nameEnd])) {
      nameEnd += 1;
    }

    const name = text.slice(nameStart, nameEnd);
    if (!isCommonEnvVar(name)) {
      names.add(name);
    }
    index = nameEnd;
  }

  return { names, linkedPaths };
}

function extractToolMentionsFromText(text: string): ToolMentions {
  return extractToolMentionsFromTextWithSigil(text, "$");
}

export function collectToolMentions(
  text: string,
  mentionPaths: Record<string, string>,
): ToolMentions {
  const mentions = extractToolMentionsFromText(text);
  for (const [name, path] of Object.entries(mentionPaths)) {
    if (mentions.names.has(name)) {
      mentions.linkedPaths.set(name, path);
    }
  }
  return mentions;
}

export function findSkillMentionsWithToolMentions(
  mentions: ToolMentions,
  skills: SkillMetadata[],
): SkillMetadata[] {
  if (mentions.names.size === 0) return [];

  const mentionSkillPaths = new Set<string>();
  for (const linkedPath of mentions.linkedPaths.values()) {
    if (isSkillPath(linkedPath)) {
      mentionSkillPaths.add(normalizeSkillPath(linkedPath));
    }
  }

  const seenNames = new Set<string>();
  const seenPaths = new Set<string>();
  const matches: SkillMetadata[] = [];

  for (const skill of skills) {
    const path = skill.pathToSkillsMd?.trim();
    if (!path || seenPaths.has(path)) continue;
    if (mentionSkillPaths.has(path)) {
      seenPaths.add(path);
      seenNames.add(skill.name);
      matches.push(skill);
    }
  }

  for (const skill of skills) {
    const path = skill.pathToSkillsMd?.trim();
    if (path && seenPaths.has(path)) continue;
    if (mentions.names.has(skill.name) && !seenNames.has(skill.name)) {
      if (path) seenPaths.add(path);
      seenNames.add(skill.name);
      matches.push(skill);
    }
  }

  return matches;
}

export function openSkillsListSuggestionText(): string {
  // TUI inserts `$` directly into the composer to open skills list.
  return "$";
}
