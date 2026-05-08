function shellQuotePart(value: string): string {
  if (value.length === 0) {
    return "''";
  }

  // Conservative set of characters that are safe unquoted in POSIX shells.
  const safe = /^[a-zA-Z0-9_@%+=:,./-]+$/;
  if (safe.test(value)) {
    return value;
  }

  // Single-quote and escape embedded single quotes using the POSIX pattern.
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function escapeCommand(command: string[]): string {
  return command.map(shellQuotePart).join(" ");
}

function basename(command0: string): string {
  const normalized = command0.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function extractShellCommand(command: string[]): string | null {
  if (command.length < 3) return null;
  const shell = basename(command[0]).toLowerCase();
  const flag = command[1];
  if (flag !== "-lc") return null;

  // Matches bash/zsh wrappers: bash -lc "<script>"
  if (shell === "bash" || shell === "bash.exe" || shell === "zsh" || shell === "zsh.exe") {
    return command[2];
  }
  return null;
}

export function stripBashLcAndEscape(command: string[]): string {
  const script = extractShellCommand(command);
  if (script !== null) {
    return script;
  }
  return escapeCommand(command);
}

function shlexSplit(input: string): string[] | null {
  const out: string[] = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  const push = () => {
    out.push(cur);
    cur = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }

    if (!inSingle && ch === "\\") {
      escaped = true;
      continue;
    }

    if (!inDouble && ch === "'" && !escaped) {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"' && !escaped) {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (cur.length > 0) {
        push();
      }
      continue;
    }

    cur += ch;
  }

  if (escaped || inSingle || inDouble) {
    return null;
  }

  if (cur.length > 0) {
    push();
  }

  return out;
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function splitCommandString(command: string): string[] {
  const parts = shlexSplit(command);
  if (!parts) {
    return [command];
  }

  const roundTrip = escapeCommand(parts);
  const roundTripParts = shlexSplit(roundTrip);

  if (roundTrip === command) {
    return parts;
  }

  // Preserve Windows commands that include drive letters if we can't round-trip safely.
  if (!command.includes(":\\") && roundTripParts && arraysEqual(roundTripParts, parts)) {
    return parts;
  }

  return [command];
}

export function relativizeToHome(pathValue: string, homeDir?: string): string | null {
  if (!homeDir) return null;

  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "");
  const pathNorm = normalize(pathValue);
  const homeNorm = normalize(homeDir);

  if (!pathNorm.startsWith("/") && !/^[a-zA-Z]:\//.test(pathNorm)) {
    return null;
  }

  if (pathNorm === homeNorm) {
    return "";
  }

  const prefix = homeNorm.endsWith("/") ? homeNorm : `${homeNorm}/`;
  if (!pathNorm.startsWith(prefix)) {
    return null;
  }

  return pathNorm.slice(prefix.length);
}
