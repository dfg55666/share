import type { HistoryCell, UserTextElement } from "../headless/chatwidget/history_cell";
import { UserHistoryCell } from "../headless/chatwidget/history_cell";

export type BacktrackResult = {
  requestedTurns: number;
  acceptedTurns: number;
};

export type BacktrackSelection = {
  nthUserMessage: number;
  prefill: string;
  textElements: UserTextElement[];
  localImagePaths: string[];
  remoteImageUrls: string[];
};

type TrimResult = {
  changed: boolean;
  cells: HistoryCell[];
};

type UserCellPayload = {
  message: string;
  textElements: UserTextElement[];
  localImagePaths: string[];
  remoteImageUrls: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeTextElements(value: unknown): UserTextElement[] {
  if (!Array.isArray(value)) return [];
  const out: UserTextElement[] = [];
  for (const entry of value) {
    const rec = asRecord(entry);
    const range = asRecord(rec?.byteRange);
    const start = range?.start;
    const end = range?.end;
    if (typeof start !== "number" || typeof end !== "number") continue;
    out.push({
      byteRange: { start, end },
      placeholder: typeof rec?.placeholder === "string" ? rec.placeholder : null,
    });
  }
  return out;
}

function userCellPayload(cell: HistoryCell): UserCellPayload | null {
  if (cell instanceof UserHistoryCell) {
    return {
      message: cell.message,
      textElements: cell.textElements,
      localImagePaths: cell.localImagePaths,
      remoteImageUrls: cell.remoteImageUrls,
    };
  }

  if (cell.kind !== "user_message") {
    return null;
  }

  const rec = asRecord(cell);
  if (!rec) return null;
  return {
    message: typeof rec.message === "string" ? rec.message : "",
    textElements: normalizeTextElements(rec.textElements),
    localImagePaths: normalizeStringArray(rec.localImagePaths),
    remoteImageUrls: normalizeStringArray(rec.remoteImageUrls),
  };
}

function lastSessionBoundary(cells: HistoryCell[]): number {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index]?.kind === "session_info") {
      return index + 1;
    }
  }
  return 0;
}

function userPositions(cells: HistoryCell[]): number[] {
  const start = lastSessionBoundary(cells);
  const positions: number[] = [];
  for (let index = start; index < cells.length; index += 1) {
    if (userCellPayload(cells[index]) !== null) {
      positions.push(index);
    }
  }
  return positions;
}

export function normalizeBacktrackTurns(numTurns: number): number {
  if (!Number.isFinite(numTurns)) return 1;
  const integerTurns = Math.floor(numTurns);
  if (integerTurns < 1) return 1;
  return integerTurns;
}

export function buildBacktrackResult(numTurns: number): BacktrackResult {
  const acceptedTurns = normalizeBacktrackTurns(numTurns);
  return {
    requestedTurns: numTurns,
    acceptedTurns,
  };
}

export function userCount(cells: HistoryCell[]): number {
  return userPositions(cells).length;
}

export function nthUserPosition(cells: HistoryCell[], nth: number): number | null {
  if (!Number.isInteger(nth) || nth < 0) return null;
  const positions = userPositions(cells);
  if (nth >= positions.length) return null;
  return positions[nth] ?? null;
}

export function trimTranscriptCellsToNthUser(
  cells: HistoryCell[],
  nthUserMessage: number,
): TrimResult {
  const cutIndex = nthUserPosition(cells, nthUserMessage);
  if (cutIndex === null) {
    return { changed: false, cells: [...cells] };
  }
  const next = cells.slice(0, cutIndex);
  return { changed: next.length !== cells.length, cells: next };
}

export function trimTranscriptCellsDropLastNUserTurns(
  cells: HistoryCell[],
  numTurns: number,
): TrimResult {
  const turns = normalizeBacktrackTurns(numTurns);
  const positions = userPositions(cells);
  if (positions.length === 0) {
    return { changed: false, cells: [...cells] };
  }

  const cutIndex =
    turns >= positions.length ? (positions[0] ?? 0) : (positions[positions.length - turns] ?? 0);
  const next = cells.slice(0, cutIndex);
  return { changed: next.length !== cells.length, cells: next };
}

export function buildBacktrackSelection(
  cells: HistoryCell[],
  nthUserMessage: number,
): BacktrackSelection | null {
  const index = nthUserPosition(cells, nthUserMessage);
  if (index === null) return null;

  const payload = userCellPayload(cells[index]);
  if (!payload) {
    return {
      nthUserMessage,
      prefill: "",
      textElements: [],
      localImagePaths: [],
      remoteImageUrls: [],
    };
  }

  return {
    nthUserMessage,
    prefill: payload.message,
    textElements: payload.textElements,
    localImagePaths: payload.localImagePaths,
    remoteImageUrls: payload.remoteImageUrls,
  };
}
