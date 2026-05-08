// Phase 1: TUI -> Web 1:1 semantic port of `key_hint.rs`.
//
// The upstream implementation is based on crossterm `KeyEvent`. In the browser we
// adapt to `KeyboardEvent` while keeping the same call sites (`plain/alt/ctrl/...`,
// `KeyBinding.isPress`, and formatting helpers).

export type KeyCode =
  | "Enter"
  | "Space"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "PageUp"
  | "PageDown"
  | "Escape"
  | "Backspace"
  | "Tab"
  | { char: string }
  | { raw: string };

export interface KeyModifiers {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

function normalizeKeyCode(code: KeyCode): string {
  if (typeof code === "string") return code;
  if ("char" in code) return code.char;
  return code.raw;
}

function isMacLike(): boolean {
  // Avoid `navigator.userAgentData` to keep compatibility.
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

function modifiersToString(mods: KeyModifiers): string {
  const altPrefix = isMacLike() ? "⌥ + " : "alt + ";
  let out = "";
  if (mods.ctrl) out += "ctrl + ";
  if (mods.shift) out += "shift + ";
  if (mods.alt) out += altPrefix;
  return out;
}

export class KeyBinding {
  readonly key: KeyCode;
  readonly modifiers: KeyModifiers;

  constructor(key: KeyCode, modifiers: KeyModifiers) {
    this.key = key;
    this.modifiers = modifiers;
  }

  isPress(event: KeyboardEvent): boolean {
    // TUI matches Press or Repeat. Browser `keydown` emits repeats with `event.repeat=true`.
    const key = normalizeKeyCode(this.key);

    const eventKey = (() => {
      if (event.key === " ") return "Space";
      if (event.key.length === 1) return event.key;
      return event.key;
    })();

    const mods: KeyModifiers = {
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
    };

    return (
      key === eventKey &&
      this.modifiers.ctrl === mods.ctrl &&
      this.modifiers.shift === mods.shift &&
      this.modifiers.alt === mods.alt
    );
  }
}

const NONE: KeyModifiers = { ctrl: false, shift: false, alt: false };

export function plain(key: KeyCode): KeyBinding {
  return new KeyBinding(key, NONE);
}

export function alt(key: KeyCode): KeyBinding {
  return new KeyBinding(key, { ctrl: false, shift: false, alt: true });
}

export function shift(key: KeyCode): KeyBinding {
  return new KeyBinding(key, { ctrl: false, shift: true, alt: false });
}

export function ctrl(key: KeyCode): KeyBinding {
  return new KeyBinding(key, { ctrl: true, shift: false, alt: false });
}

export function ctrl_alt(key: KeyCode): KeyBinding {
  return new KeyBinding(key, { ctrl: true, shift: false, alt: true });
}

export function formatKeyBinding(binding: KeyBinding): string {
  const key = normalizeKeyCode(binding.key);
  const label = (() => {
    switch (key) {
      case "Enter":
        return "enter";
      case "Space":
        return "space";
      case "ArrowUp":
        return "↑";
      case "ArrowDown":
        return "↓";
      case "ArrowLeft":
        return "←";
      case "ArrowRight":
        return "→";
      case "PageUp":
        return "pgup";
      case "PageDown":
        return "pgdn";
      default:
        return String(key).toLowerCase();
    }
  })();

  return `${modifiersToString(binding.modifiers)}${label}`;
}

export function has_ctrl_or_alt(mods: KeyModifiers): boolean {
  return (mods.ctrl || mods.alt) && !is_altgr(mods);
}

export function is_altgr(mods: KeyModifiers): boolean {
  // Mirrors upstream: on Windows AltGr is commonly Ctrl+Alt. We treat that as AltGr
  // everywhere to avoid triggering ctrl/alt shortcuts when user types special chars.
  return mods.alt && mods.ctrl;
}

