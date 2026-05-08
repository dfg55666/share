// Web port of `tuitoweb/src/bottom_pane/skill_popup.rs`.

import type { BottomPaneView } from "./bottom_pane_view";
import { MAX_POPUP_ROWS } from "./popup_consts";
import { ScrollState } from "./scroll_state";
import { type GenericDisplayRow, renderRowsModel } from "./selection_popup_common";

export type MentionItem = {
  name: string;
  path: string;
  description?: string | null;
  insertText?: string;
  searchTerms?: string[];
  categoryTag?: string | null;
  sortRank?: number;
};

type FilteredMatch = {
  index: number;
  indices: number[] | null;
  score: number;
};

function fuzzyMatch(candidate: string, query: string): { indices: number[]; score: number } | null {
  const lowerCandidate = candidate.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery) return { indices: [], score: 0 };

  const indices: number[] = [];
  let queryCursor = 0;
  let score = 0;
  for (let i = 0; i < lowerCandidate.length && queryCursor < lowerQuery.length; i += 1) {
    if (lowerCandidate[i] === lowerQuery[queryCursor]) {
      indices.push(i);
      score += i;
      queryCursor += 1;
    }
  }
  if (queryCursor !== lowerQuery.length) return null;
  return { indices, score };
}

export class SkillPopup implements BottomPaneView {
  private mentions: MentionItem[];
  private query = "";
  private readonly state = new ScrollState();
  private complete = false;

  constructor(items: MentionItem[]) {
    this.mentions = [...items];
    this.syncSelection();
  }

  viewId(): string {
    return "SkillPopup";
  }

  setMentions(items: MentionItem[]): void {
    this.mentions = [...items];
    this.syncSelection();
  }

  setQuery(query: string): void {
    this.query = query.trim();
    this.syncSelection();
  }

  getQuery(): string {
    return this.query;
  }

  listItems(): MentionItem[] {
    return this.mentions;
  }

  filteredItems(): MentionItem[] {
    return this.filtered().map((entry) => this.mentions[entry.index]).filter(Boolean);
  }

  selectedMention(): MentionItem | null {
    const matches = this.filtered();
    const selected = this.state.selectedIndexOrNull();
    if (selected === null) return null;
    const match = matches[selected];
    if (!match) return null;
    return this.mentions[match.index] ?? null;
  }

  calculateRequiredHeight(): number {
    const visible = Math.max(1, Math.min(MAX_POPUP_ROWS, this.filtered().length || 1));
    return visible + 2;
  }

  moveUp(): void {
    const len = this.filtered().length;
    this.state.moveUpWrap(len);
    this.state.ensureVisible(len, this.maxVisibleRows(len));
  }

  moveDown(): void {
    const len = this.filtered().length;
    this.state.moveDownWrap(len);
    this.state.ensureVisible(len, this.maxVisibleRows(len));
  }

  acceptSelected(): MentionItem | null {
    const mention = this.selectedMention();
    if (!mention) return null;
    this.complete = true;
    return mention;
  }

  rows(width = 72): ReturnType<typeof renderRowsModel> {
    const rows: GenericDisplayRow[] = this.filtered().map((match) => {
      const mention = this.mentions[match.index];
      return {
        name: mention?.name ?? "",
        description: mention?.description ?? null,
        categoryTag: mention?.categoryTag ?? null,
        matchIndices: match.indices,
      };
    });

    return renderRowsModel(rows, this.state, MAX_POPUP_ROWS, width, "no matches");
  }

  close(): void {
    this.complete = true;
  }

  isComplete(): boolean {
    return this.complete;
  }

  private filtered(): FilteredMatch[] {
    const filter = this.query.trim();
    const out: FilteredMatch[] = [];

    for (let idx = 0; idx < this.mentions.length; idx += 1) {
      const mention = this.mentions[idx];
      if (!mention) continue;

      if (!filter) {
        out.push({ index: idx, indices: null, score: 0 });
        continue;
      }

      let best: { indices: number[] | null; score: number } | null = null;
      const byName = fuzzyMatch(mention.name, filter);
      if (byName) {
        best = { indices: byName.indices, score: byName.score };
      }

      for (const term of mention.searchTerms ?? []) {
        if (!term || term === mention.name) continue;
        const hit = fuzzyMatch(term, filter);
        if (!hit) continue;
        if (!best || hit.score < best.score) {
          best = { indices: null, score: hit.score };
        }
      }

      if (best) {
        out.push({ index: idx, indices: best.indices, score: best.score });
      }
    }

    out.sort((a, b) => {
      const aRank = this.mentions[a.index]?.sortRank ?? 1;
      const bRank = this.mentions[b.index]?.sortRank ?? 1;
      if (aRank !== bRank) return aRank - bRank;
      if (a.score !== b.score) return a.score - b.score;
      return (this.mentions[a.index]?.name ?? "").localeCompare(this.mentions[b.index]?.name ?? "");
    });

    return out;
  }

  private syncSelection(): void {
    const len = this.filtered().length;
    this.state.clampSelection(len);
    this.state.ensureVisible(len, this.maxVisibleRows(len));
  }

  private maxVisibleRows(len: number): number {
    return Math.min(MAX_POPUP_ROWS, Math.max(1, len));
  }
}
