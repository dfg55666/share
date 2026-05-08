// Web port of `tuitoweb/src/bottom_pane/unified_exec_footer.rs`.
//
// Keeps one canonical summary message for background unified-exec sessions so
// status row and footer can share copy/grammar behavior.

export type UnifiedExecSummary = {
  runningCount: number;
  lastCommand?: string | null;
  processes?: string[];
  summaryText?: string | null;
};

function toProcessList(summary: UnifiedExecSummary): string[] {
  if (Array.isArray(summary.processes) && summary.processes.length > 0) {
    return summary.processes.filter((item) => typeof item === "string" && item.length > 0);
  }
  if (summary.runningCount <= 0) return [];
  if (summary.lastCommand) return [summary.lastCommand];
  return Array.from({ length: summary.runningCount }, (_, idx) => `process-${idx + 1}`);
}

function truncateToWidth(text: string, width: number): string {
  const w = Math.max(1, Math.floor(width));
  if (text.length <= w) return text;
  if (w <= 1) return text.slice(0, 1);
  return `${text.slice(0, w - 1)}…`;
}

export class UnifiedExecFooter {
  private processes: string[] = [];

  setSummary(summary: UnifiedExecSummary): void {
    this.processes = toProcessList(summary);
  }

  setProcesses(processes: string[]): boolean {
    const next = processes.filter((item) => typeof item === "string" && item.length > 0);
    const changed =
      next.length !== this.processes.length ||
      next.some((item, idx) => this.processes[idx] !== item);
    this.processes = next;
    return changed;
  }

  isEmpty(): boolean {
    return this.processes.length === 0;
  }

  summaryText(): string | null {
    if (this.isEmpty()) return null;
    const count = this.processes.length;
    const plural = count === 1 ? "" : "s";
    return `${count} background terminal${plural} running · /ps to view · /stop to close`;
  }

  renderLines(width: number): string[] {
    const summary = this.summaryText();
    if (!summary) return [];
    return [truncateToWidth(`  ${summary}`, width)];
  }

  getSummary(): UnifiedExecSummary {
    return {
      runningCount: this.processes.length,
      lastCommand: this.processes[this.processes.length - 1] ?? null,
      processes: [...this.processes],
      summaryText: this.summaryText(),
    };
  }
}
