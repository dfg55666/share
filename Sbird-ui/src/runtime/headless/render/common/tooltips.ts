// Web Phase 1 port of `tuitoweb/src/tooltips.rs`.
//
// The upstream CLI displays a random startup tooltip (and sometimes a remotely hosted
// announcement tip). On the web we keep a small pool and optional remote announcement fetch.

const ANNOUNCEMENT_TIP_URL =
  "https://raw.githubusercontent.com/openai/codex/main/announcement_tip.toml";

const TOOLTIP_POOL: readonly string[] = [
  "Tip: Use /fast to trade plan usage for faster inference.",
  "Tip: Use /diff to inspect changes before applying patches.",
  "Tip: Use @ to mention files once file search is available in the host.",
];

function randomBool(prob: number): boolean {
  return Math.random() < prob;
}

function pickRandom(list: readonly string[]): string | null {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] ?? null;
}

export async function getTooltip(opts?: {
  plan?: string | null;
  fastModeEnabled?: boolean;
  allowAnnouncementFetch?: boolean;
}): Promise<string | null> {
  const fastEnabled = !!opts?.fastModeEnabled;
  const allowAnnouncementFetch = opts?.allowAnnouncementFetch ?? true;

  if (allowAnnouncementFetch) {
    const announcementTip = await announcement.fetchAnnouncementTip();
    if (announcementTip) return announcementTip;
  }

  // Leave a chance that we show nothing, mirroring upstream's "sometimes" behavior.
  if (!randomBool(0.2)) {
    return null;
  }

  if (!fastEnabled && randomBool(0.5)) {
    return "New: Try /fast to enable our fastest inference at 2X plan usage.";
  }

  return pickRandom(TOOLTIP_POOL);
}

export const announcement = {
  async fetchAnnouncementTip(timeoutMs = 2000): Promise<string | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(ANNOUNCEMENT_TIP_URL, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const text = await res.text();
      return parseAnnouncementTipToml(text);
    } catch {
      return null;
    }
  },
};

// Minimal parser: the upstream TOML supports multiple announcements and filters by date/version.
// For Phase 1 we accept a single `content = "..."` entry or a bare text file.
export function parseAnnouncementTipToml(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const contentMatch = trimmed.match(/content\\s*=\\s*\"([^\"]+)\"/);
  if (contentMatch?.[1]) {
    return contentMatch[1].trim() || null;
  }

  // Fall back to first non-empty, non-comment line.
  const line = trimmed
    .split(/\\r?\\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  return line ?? null;
}
