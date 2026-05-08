import { pushOwnedLines } from "../line_utils";
import type { RtLine } from "../line_utils";
import { renderMarkdownTextWithWidthAndCwd } from "./markdown_render";

export function appendMarkdown(
  markdownSource: string,
  width: number | null,
  cwd: string | null,
  lines: RtLine[],
): void {
  const rendered = renderMarkdownTextWithWidthAndCwd(markdownSource, width, cwd);
  pushOwnedLines(rendered.lines, lines);
}

