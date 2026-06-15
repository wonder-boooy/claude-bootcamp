import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, writeState, clearState } from "../src/core/state.ts";
import type { InstallState } from "../src/types.ts";

function tmpStatePath(): string {
  return join(mkdtempSync(join(tmpdir(), "cbc-")), ".claude-bootcamp.json");
}

const sample: InstallState = {
  version: "0.1.0",
  lang: "ja",
  mode: "replace",
  scope: "user",
  settingsPath: "/home/x/.claude/settings.json",
  verbsHash: "abc",
  installedAt: "2026-06-15T00:00:00.000Z",
};

test("readState は存在しなければ null", () => {
  assert.equal(readState(tmpStatePath()), null);
});

test("write→read で往復する", () => {
  const p = tmpStatePath();
  writeState(p, sample);
  assert.deepEqual(readState(p), sample);
});

test("readState は壊れた JSON で null（フォールバック）", () => {
  const p = tmpStatePath();
  writeFileSync(p, "{ broken");
  assert.equal(readState(p), null);
});

test("clearState は削除する", () => {
  const p = tmpStatePath();
  writeState(p, sample);
  clearState(p);
  assert.equal(readState(p), null);
});
