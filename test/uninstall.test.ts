import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall } from "../src/commands/install.ts";
import { runUninstall } from "../src/commands/uninstall.ts";
import { readSettings } from "../src/core/settings.ts";
import { readState } from "../src/core/state.ts";

function ctx() {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return { settingsPath: join(dir, "settings.json"), statePath: join(dir, ".claude-bootcamp.json") };
}

test("uninstall はツール導入値を除去し他キーを残す", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, JSON.stringify({ theme: "dark" }));
  runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });

  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "removed");

  const settings = readSettings(c.settingsPath);
  assert.equal("spinnerVerbs" in settings, false);
  assert.equal(settings.theme, "dark");
  assert.equal(readState(c.statePath), null);
});

test("uninstall は state が無ければ no-op", () => {
  const c = ctx();
  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "not-installed");
});

test("uninstall は手動改変を検知して中断（消さない）", () => {
  const c = ctx();
  runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });
  writeFileSync(c.settingsPath, JSON.stringify({ spinnerVerbs: { mode: "replace", verbs: ["自作"] } }));

  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "modified");
  const settings = readSettings(c.settingsPath);
  assert.deepEqual(settings.spinnerVerbs, { mode: "replace", verbs: ["自作"] });
});
