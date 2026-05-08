// Port of `tuitoweb/src/style.rs`.
//
// The Rust TUI computes subtle background colors for user messages and proposed plans by blending
// against the detected terminal background and snapping to the closest palette color. In the web
// runtime we keep the same computation but output CSS color strings.

import type { RtStyle } from "../line_utils";

import { blend, isLight, type Rgb } from "./color";
import { bestColor, defaultBg } from "./terminal_palette";

export function userMessageStyle(): RtStyle {
  return userMessageStyleFor(defaultBg());
}

export function proposedPlanStyle(): RtStyle {
  return proposedPlanStyleFor(defaultBg());
}

export function userMessageStyleFor(terminalBg: Rgb | null): RtStyle {
  return terminalBg ? { bg: userMessageBg(terminalBg) } : {};
}

export function proposedPlanStyleFor(terminalBg: Rgb | null): RtStyle {
  return terminalBg ? { bg: proposedPlanBg(terminalBg) } : {};
}

export function userMessageBg(terminalBg: Rgb): string {
  const top: Rgb = isLight(terminalBg) ? [0, 0, 0] : [255, 255, 255];
  const alpha = isLight(terminalBg) ? 0.04 : 0.12;
  const blended = blend(top, terminalBg, alpha);
  return bestColor(blended);
}

export function proposedPlanBg(terminalBg: Rgb): string {
  // In upstream this matches user message background.
  return userMessageBg(terminalBg);
}
