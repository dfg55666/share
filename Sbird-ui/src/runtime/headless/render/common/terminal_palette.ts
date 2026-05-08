// Port of `tuitoweb/src/terminal_palette.rs`.
//
// The Rust TUI queries terminal color capabilities (truecolor vs ANSI) and maps RGB colors
// to the closest representable palette entry. In a browser we effectively always have truecolor,
// but we keep the same API so styling logic can be ported 1:1.

import { perceptualDistance, type Rgb } from "./color";

export type StdoutColorLevel = "TrueColor" | "Ansi256" | "Ansi16" | "Unknown";

let PALETTE_VERSION = 0;

export function stdoutColorLevel(): StdoutColorLevel {
  // Browser canvas/CSS is truecolor.
  return typeof document !== "undefined" ? "TrueColor" : "Unknown";
}

export function paletteVersion(): number {
  return PALETTE_VERSION;
}

export function requeryDefaultColors(): void {
  // In the TUI this re-queries crossterm defaults. For the web, just bump the version so any
  // caches that depend on background/foreground can invalidate.
  PALETTE_VERSION += 1;
}

export type DefaultColors = {
  fg: Rgb;
  bg: Rgb;
};

function parseCssRgb(input: string): Rgb | null {
  const text = (input ?? "").trim();
  const m = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/i.exec(
    text,
  );
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

export function defaultColors(): DefaultColors | null {
  if (typeof document === "undefined") return null;
  try {
    const style = getComputedStyle(document.body);
    const fg = parseCssRgb(style.color);
    const bg = parseCssRgb(style.backgroundColor);
    return fg && bg ? { fg, bg } : null;
  } catch {
    return null;
  }
}

export function defaultFg(): Rgb | null {
  return defaultColors()?.fg ?? null;
}

export function defaultBg(): Rgb | null {
  return defaultColors()?.bg ?? null;
}

export function rgbColor(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function indexedColor(index: number): string {
  const i = Math.max(0, Math.min(255, Math.floor(index)));
  const rgb = XTERM_COLORS[i] ?? [0, 0, 0];
  return rgbColor(rgb);
}

function buildXtermColors(): Array<Rgb> {
  const colors: Array<Rgb> = new Array(256);

  // 0..15: "system" palette (values align with upstream constant; terminals may override).
  const system: Array<Rgb> = [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
  ];
  for (let i = 0; i < system.length; i += 1) colors[i] = system[i]!;

  // 16..231: 6x6x6 color cube.
  const steps = [0, 95, 135, 175, 215, 255];
  let idx = 16;
  for (const r of steps) {
    for (const g of steps) {
      for (const b of steps) {
        colors[idx] = [r, g, b];
        idx += 1;
      }
    }
  }

  // 232..255: grayscale ramp.
  for (let i = 232; i <= 255; i += 1) {
    const v = 8 + (i - 232) * 10;
    colors[i] = [v, v, v];
  }

  return colors;
}

export const XTERM_COLORS: Array<Rgb> = buildXtermColors();

function* xtermFixedColors(): IterableIterator<[number, Rgb]> {
  for (let i = 16; i < XTERM_COLORS.length; i += 1) {
    const rgb = XTERM_COLORS[i];
    if (rgb) yield [i, rgb];
  }
}

// Returns the closest color to the target color that the environment can display.
export function bestColor(target: Rgb): string {
  const level = stdoutColorLevel();
  if (level === "TrueColor") {
    return rgbColor(target);
  }
  if (level === "Ansi256") {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [idx, rgb] of xtermFixedColors()) {
      const d = perceptualDistance(rgb, target);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = idx;
      }
    }
    return indexedColor(bestIndex);
  }
  return rgbColor(target);
}

