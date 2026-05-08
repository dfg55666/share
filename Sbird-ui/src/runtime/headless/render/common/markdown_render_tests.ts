import { renderMarkdownTextWithWidthAndCwd } from "./markdown_render";

function linesToStrings(lines: { spans: { content: string }[] }[]): string[] {
  return lines.map((line) => line.spans.map((s) => s.content).join(""));
}

export function runMarkdownRenderSelfTest(): void {
  // Citations should remain plain text.
  {
    const src = "Before 【F:/x.rs†L1】\nAfter 【F:/x.rs†L3】\n";
    const rendered = renderMarkdownTextWithWidthAndCwd(src, null, null);
    const strings = linesToStrings(rendered.lines);
    if (strings[0] !== "Before 【F:/x.rs†L1】" || strings[1] !== "After 【F:/x.rs†L3】") {
      throw new Error(`citations test failed: ${JSON.stringify(strings)}`);
    }
  }

  // Indented code blocks should preserve leading whitespace.
  {
    const src = "Before\n\n    code 1\n\nAfter\n";
    const rendered = renderMarkdownTextWithWidthAndCwd(src, null, null);
    const strings = linesToStrings(rendered.lines);
    const expected = ["Before", "", "    code 1", "", "After", ""];
    if (JSON.stringify(strings) !== JSON.stringify(expected)) {
      throw new Error(`indented code test failed:\n${JSON.stringify(strings)}\n!=\n${JSON.stringify(expected)}`);
    }
  }

  // Ordered list marker should not split into separate marker-only lines.
  {
    const src = "Loose vs. tight list items:\n1. Tight item\n";
    const rendered = renderMarkdownTextWithWidthAndCwd(src, null, null);
    const strings = linesToStrings(rendered.lines);
    if (!strings.some((line) => line === "1. Tight item")) {
      throw new Error(`ordered list test failed: ${JSON.stringify(strings)}`);
    }
    for (let i = 0; i + 1 < strings.length; i += 1) {
      if (strings[i].trimEnd() === "1." && strings[i + 1] === "Tight item") {
        throw new Error(`ordered list marker unexpectedly split: ${JSON.stringify(strings)}`);
      }
    }
  }
}

