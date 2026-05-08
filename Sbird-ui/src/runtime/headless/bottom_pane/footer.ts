// Port subset of `tuitoweb/src/bottom_pane/footer.rs`.
//
// The Rust TUI footer renders key hints and status summaries under the composer.
// Web Phase 1 exposes the same data model; rendering is handled by React.

export type FooterHintItem = {
  key: string;
  label: string;
};

export type FooterMode = "Normal" | "ShortcutHelp";

export type FooterProps = {
  mode: FooterMode;
  hintItems: FooterHintItem[];
  statusText?: string | null;
};

export function defaultFooterProps(): FooterProps {
  return { mode: "Normal", hintItems: [] };
}

export function modeIndicatorLine(mode: FooterMode): string {
  return mode === "ShortcutHelp" ? "Shortcuts" : "";
}
