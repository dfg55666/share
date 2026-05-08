// Web port of `tuitoweb/src/bottom_pane/request_user_input/layout.rs`.
//
// This keeps the section-allocation behavior in a headless model:
// progress/question/options/notes/footer are allocated from available height.

import { wrapStyledLine } from "../selection_popup_common";

export type LayoutSections = {
  progressLines: number;
  questionLines: string[];
  optionsLines: number;
  notesLines: number;
  footerLines: number;
  spacerAfterQuestion: number;
  spacerAfterOptions: number;
  totalLines: number;
};

type LayoutArgs = {
  question: string;
  width: number;
  availableHeight?: number;
  hasOptions?: boolean;
  optionsPreferredLines?: number;
  optionsRequiredLines?: number;
  notesVisible?: boolean;
  notesPreferredLines?: number;
  footerPreferredLines?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizedHeight(height?: number): number {
  if (typeof height !== "number" || !Number.isFinite(height)) {
    return 9999;
  }
  return Math.max(0, Math.floor(height));
}

export function layoutSections(args: LayoutArgs): LayoutSections {
  const width = Math.max(1, Math.floor(args.width || 1));
  const available = normalizedHeight(args.availableHeight);
  const hasOptions = Boolean(args.hasOptions);
  const notesVisible = args.notesVisible ?? !hasOptions;
  const footerPref = Math.max(0, Math.floor(args.footerPreferredLines ?? 1));
  const notesPref = Math.max(0, Math.floor(args.notesPreferredLines ?? 0));

  const wrappedQuestion = wrapStyledLine(args.question ?? "", width);
  let questionHeight = wrappedQuestion.length;
  let progressLines = 0;
  let optionsLines = 0;
  let notesLines = 0;
  let footerLines = 0;
  let spacerAfterQuestion = 0;
  let spacerAfterOptions = 0;

  if (hasOptions) {
    const preferred = Math.max(1, Math.floor(args.optionsPreferredLines ?? 3));
    const required = Math.max(preferred, Math.floor(args.optionsRequiredLines ?? preferred));
    const minOptions = 1;
    const maxQuestion = Math.max(0, available - minOptions);
    questionHeight = Math.min(questionHeight, maxQuestion);
    optionsLines = clamp(preferred, minOptions, Math.max(minOptions, available - questionHeight));
    let remaining = Math.max(0, available - questionHeight - optionsLines);

    if (remaining > 0) {
      progressLines = 1;
      remaining -= 1;
    }

    if (notesVisible) {
      footerLines = Math.min(footerPref, remaining);
      remaining -= footerLines;
      if (remaining > 0) {
        spacerAfterQuestion = 1;
        remaining -= 1;
      }
      notesLines = Math.min(notesPref, remaining);
      remaining -= notesLines;
      notesLines += remaining;
    } else {
      if (remaining > footerPref) {
        spacerAfterOptions = 1;
        remaining -= 1;
      }
      footerLines = Math.min(footerPref, remaining);
      remaining -= footerLines;
      if (remaining > 0) {
        spacerAfterQuestion = 1;
        remaining -= 1;
      }
      optionsLines = Math.min(required, optionsLines + remaining);
    }
  } else {
    if (questionHeight > available) {
      questionHeight = available;
    }
    let remaining = Math.max(0, available - questionHeight);
    notesLines = Math.min(notesPref, remaining);
    remaining -= notesLines;
    footerLines = Math.min(footerPref, remaining);
    remaining -= footerLines;
    if (remaining > 0) {
      progressLines = 1;
      remaining -= 1;
    }
    notesLines += remaining;
  }

  const totalLines =
    progressLines +
    questionHeight +
    spacerAfterQuestion +
    optionsLines +
    spacerAfterOptions +
    notesLines +
    footerLines;

  return {
    progressLines,
    questionLines: wrappedQuestion.slice(0, questionHeight),
    optionsLines,
    notesLines,
    footerLines,
    spacerAfterQuestion,
    spacerAfterOptions,
    totalLines,
  };
}
