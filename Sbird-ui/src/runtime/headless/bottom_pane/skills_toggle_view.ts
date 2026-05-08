// Web Phase 1 port of `tuitoweb/src/bottom_pane/skills_toggle_view.rs`.

import type { BottomPaneView } from "./bottom_pane_view";

export type SkillsToggleItem = {
  name: string;
  skillName: string;
  description?: string | null;
  enabled: boolean;
  path?: string | null;
};

export class SkillsToggleView implements BottomPaneView {
  private readonly items: SkillsToggleItem[];
  private complete = false;

  constructor(items: SkillsToggleItem[]) {
    this.items = items.map((item) => ({ ...item }));
  }

  listItems(): SkillsToggleItem[] {
    return this.items;
  }

  toggle(skillName: string, enabled: boolean): void {
    const target = skillName.trim();
    for (let i = 0; i < this.items.length; i += 1) {
      if (this.items[i]?.skillName === target) {
        this.items[i] = { ...this.items[i], enabled };
      }
    }
  }

  close(): void {
    this.complete = true;
  }

  isComplete(): boolean {
    return this.complete;
  }
}
