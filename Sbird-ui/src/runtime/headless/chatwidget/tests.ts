// Port note: `tuitoweb/src/chatwidget/tests.rs` contains snapshot-style invariants tests for the
// Rust TUI. Web Phase 1 does not ship an equivalent test runner yet; keep a small self-test hook.

import {
  collectToolMentions,
  findSkillMentionsWithToolMentions,
  type SkillMetadata,
} from "./skills";
import { pendingSteerCompareKeyFromInputs } from "./realtime";
import { buildTerminalTitle } from "./status_surfaces";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected=${String(expected)} actual=${String(actual)}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function runChatWidgetSelfTest(): boolean {
  const mentions = collectToolMentions(
    "Use $alpha and [$beta](skill://skills/beta/SKILL.md), ignore $PATH",
    {
      alpha: "skill://skills/alpha/SKILL.md",
    },
  );
  assertTrue(mentions.names.has("alpha"), "collectToolMentions should include plain mention");
  assertTrue(mentions.names.has("beta"), "collectToolMentions should include linked mention");
  assertTrue(!mentions.names.has("PATH"), "collectToolMentions should ignore env var mentions");
  assertEqual(
    mentions.linkedPaths.get("alpha"),
    "skill://skills/alpha/SKILL.md",
    "collectToolMentions should map mentionPaths",
  );

  const skills: SkillMetadata[] = [
    { name: "alpha", pathToSkillsMd: "skills/alpha/SKILL.md", enabled: true },
    { name: "beta", pathToSkillsMd: "skills/beta/SKILL.md", enabled: true },
    { name: "gamma", pathToSkillsMd: "skills/gamma/SKILL.md", enabled: true },
  ];
  const matched = findSkillMentionsWithToolMentions(mentions, skills);
  assertEqual(matched.length, 2, "findSkillMentionsWithToolMentions should return two skills");
  assertEqual(matched[0]?.name, "alpha", "matched skills should include alpha");
  assertEqual(matched[1]?.name, "beta", "matched skills should include beta");

  const compare = pendingSteerCompareKeyFromInputs([
    { kind: "text", text: "hello " },
    { kind: "image" },
    { kind: "text", text: "world" },
    { kind: "local_image" },
  ]);
  assertEqual(compare.message, "hello world", "pendingSteer key should concatenate text items");
  assertEqual(compare.imageCount, 2, "pendingSteer key should count image and local_image items");

  const title = buildTerminalTitle({
    nowMs: 0,
    items: ["spinner", "project", "status"],
    projectName: "sbird",
    statusKind: "Working",
  });
  assertTrue(!!title, "terminal title should render when project/status exist");

  return true;
}
