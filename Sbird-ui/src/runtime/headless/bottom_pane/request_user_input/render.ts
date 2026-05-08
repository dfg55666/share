// Web port of `tuitoweb/src/bottom_pane/request_user_input/render.rs`.
//
// React owns DOM rendering; this module keeps the same normalization boundary:
// request payload -> deterministic overlay render model.

import type { RequestUserInputEvent } from "../bottom_pane_view";
import { standardPopupHintLine } from "../popup_consts";
import { layoutSections, type LayoutSections } from "./layout";

export type RequestUserInputOption = {
  label: string;
  value: string;
  description?: string | null;
  disabled?: boolean;
};

export type RequestUserInputRenderModel = {
  title: string;
  prompt: string;
  options: RequestUserInputOption[];
  questionIndex: number;
  questionCount: number;
  unansweredCount: number;
  notesVisible: boolean;
  footerHints: string[];
  layout: LayoutSections;
};

type RenderModelArgs = {
  width?: number;
  availableHeight?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toOption(value: unknown): RequestUserInputOption | null {
  if (typeof value === "string") {
    return { label: value, value };
  }

  const rec = asRecord(value);
  if (!rec) return null;
  const label = asString(rec.label, asString(rec.name, asString(rec.value)));
  const optionValue = asString(rec.value, label);
  if (!label) return null;

  return {
    label,
    value: optionValue,
    description: rec.description ? asString(rec.description) : null,
    disabled: rec.disabled === true,
  };
}

function parseOptions(payload: Record<string, unknown> | null): RequestUserInputOption[] {
  const source = payload?.options;
  if (!Array.isArray(source)) return [];
  return source.map(toOption).filter(Boolean) as RequestUserInputOption[];
}

function parseFooterHints(payload: Record<string, unknown> | null): string[] {
  const raw = payload?.footerHints;
  if (!Array.isArray(raw)) return [standardPopupHintLine()];
  const hints = raw.filter((item): item is string => typeof item === "string" && item.length > 0);
  return hints.length > 0 ? hints : [standardPopupHintLine()];
}

export function toRenderModel(
  request: RequestUserInputEvent,
  args: RenderModelArgs = {},
): RequestUserInputRenderModel {
  const payload = asRecord(request.payload);
  const options = parseOptions(payload);
  const width = Math.max(1, Math.floor(args.width ?? 80));
  const availableHeight = args.availableHeight;

  const prompt =
    (request.prompt ?? "").trim() ||
    asString(payload?.prompt, asString(payload?.question, asString(payload?.message)));

  const title = asString(payload?.title, "Input required");
  const questionIndex = Math.max(0, asNumber(payload?.currentIndex, 0));
  const questionCount = Math.max(1, asNumber(payload?.questionCount, 1));
  const unansweredCount = Math.max(0, asNumber(payload?.unansweredCount, 0));
  const notesVisible =
    payload?.notesVisible === true || payload?.allowNotes === true || options.length === 0;

  const layout = layoutSections({
    question: prompt,
    width,
    availableHeight,
    hasOptions: options.length > 0,
    optionsPreferredLines: Math.min(options.length, 6),
    optionsRequiredLines: options.length,
    notesVisible,
    notesPreferredLines: notesVisible ? 3 : 0,
    footerPreferredLines: 1,
  });

  return {
    title,
    prompt,
    options,
    questionIndex,
    questionCount,
    unansweredCount,
    notesVisible,
    footerHints: parseFooterHints(payload),
    layout,
  };
}
