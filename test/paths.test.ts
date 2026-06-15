import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { settingsPath, statePath } from "../src/core/paths.ts";

test("user スコープは ~/.claude/settings.json", () => {
  assert.equal(settingsPath("user"), join(homedir(), ".claude", "settings.json"));
});

test("project スコープは cwd/.claude/settings.json", () => {
  assert.equal(settingsPath("project", "/tmp/proj"), join("/tmp/proj", ".claude", "settings.json"));
});

test("statePath は ~/.claude/.claude-bootcamp.json", () => {
  assert.equal(statePath(), join(homedir(), ".claude", ".claude-bootcamp.json"));
});
