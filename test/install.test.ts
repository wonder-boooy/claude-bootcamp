import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall } from "../src/commands/install.ts";
import { readSettings } from "../src/core/settings.ts";
import { readState } from "../src/core/state.ts";
import { jaVerbs } from "../src/core/verbs.ts";

function ctx() {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return {
    settingsPath: join(dir, "settings.json"),
    statePath: join(dir, ".claude-bootcamp.json"),
    dir,
  };
}

test("install は日本語 verbs を replace で書き、state を残す", () => {
  const c = ctx();
  const result = runInstall({
    lang: "ja",
    mode: "replace",
    scope: "user",
    settingsPath: c.settingsPath,
    statePath: c.statePath,
  });

  assert.equal(result.changed, true);
  const settings = readSettings(c.settingsPath);
  assert.deepEqual(settings.spinnerVerbs, { mode: "replace", verbs: jaVerbs });

  const state = readState(c.statePath);
  assert.equal(state?.lang, "ja");
  assert.equal(state?.settingsPath, c.settingsPath);
});

test("install は既存の他キーを保持", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, JSON.stringify({ theme: "dark" }));
  runInstall({ lang: "en", mode: "append", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });

  const settings = readSettings(c.settingsPath);
  assert.equal(settings.theme, "dark");
  assert.equal((settings.spinnerVerbs as { mode: string }).mode, "append");
});

test("install は冪等（2回目は changed:false）", () => {
  const c = ctx();
  const opts = {
    lang: "ja" as const,
    mode: "replace" as const,
    scope: "user" as const,
    settingsPath: c.settingsPath,
    statePath: c.statePath,
  };
  runInstall(opts);
  const second = runInstall(opts);
  assert.equal(second.changed, false);
  const backups = readdirSync(c.dir).filter((f) => f.includes(".bak-"));
  assert.equal(backups.length, 0);
});

test("install は壊れた settings で中断し書き換えない", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, "{ broken");
  assert.throws(
    () => runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath }),
    /parse/i,
  );
});
