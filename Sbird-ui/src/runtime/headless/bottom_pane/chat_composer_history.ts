// Port subset of `tuitoweb/src/bottom_pane/chat_composer_history.rs`.
//
// The Rust TUI merges persistent cross-session history and local in-session history.
// Web Phase 1 keeps a small local history buffer and can persist it to localStorage.

export type HistoryEntry = {
  text: string;
  createdAtIso: string;
};

const STORAGE_KEY = "tuitoweb.composer.history.v1";
const MAX_ENTRIES = 200;

function safeLoad(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const text = typeof entry.text === "string" ? entry.text : "";
        const createdAtIso =
          typeof entry.createdAtIso === "string" ? entry.createdAtIso : new Date().toISOString();
        return text ? { text, createdAtIso } : null;
      })
      .filter((x): x is HistoryEntry => x !== null);
  } catch {
    return [];
  }
}

function safeSave(entries: HistoryEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Ignore quota errors.
  }
}

export class ChatComposerHistory {
  private readonly entries: HistoryEntry[] = safeLoad();
  private cursor: number | null = null;
  private draftBeforeTraversal = "";

  push(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.entries.length > 0 && this.entries[this.entries.length - 1]?.text === trimmed) {
      return;
    }
    this.entries.push({ text: trimmed, createdAtIso: new Date().toISOString() });
    safeSave(this.entries);
    this.resetTraversal();
  }

  resetTraversal(): void {
    this.cursor = null;
    this.draftBeforeTraversal = "";
  }

  moveUp(currentDraft: string): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === null) {
      this.draftBeforeTraversal = currentDraft;
      this.cursor = this.entries.length - 1;
    } else {
      this.cursor = Math.max(0, this.cursor - 1);
    }
    return this.entries[this.cursor]?.text ?? null;
  }

  moveDown(): string | null {
    if (this.cursor === null) return null;
    if (this.cursor >= this.entries.length - 1) {
      const draft = this.draftBeforeTraversal;
      this.resetTraversal();
      return draft;
    }
    this.cursor += 1;
    return this.entries[this.cursor]?.text ?? null;
  }
}
