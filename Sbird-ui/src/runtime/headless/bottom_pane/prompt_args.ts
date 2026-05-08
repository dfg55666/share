// Port of `tuitoweb/src/bottom_pane/prompt_args.rs`.

export function parseSlashName(
  line: string,
): { name: string; rest: string; restOffset: number } | null {
  if (!line.startsWith("/")) return null;
  const stripped = line.slice(1);
  if (!stripped) return null;

  let nameEnd = stripped.length;
  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (ch && /\s/.test(ch)) {
      nameEnd = i;
      break;
    }
  }

  const name = stripped.slice(0, nameEnd);
  if (!name) return null;

  const restUntrimmed = stripped.slice(nameEnd);
  const rest = restUntrimmed.replace(/^\s+/, "");
  const restStartInStripped = nameEnd + (restUntrimmed.length - rest.length);
  const restOffset = restStartInStripped + 1; // +1 for leading '/'

  return { name, rest, restOffset };
}
