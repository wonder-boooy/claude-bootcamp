import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSettings, writeSettingsAtomic } from "../src/core/settings.ts";

function tmpFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return join(dir, "settings.json");
}

test("readSettings は存在しなければ空オブジェクト", () => {
  assert.deepEqual(readSettings(tmpFile()), {});
});

test("readSettings は既存 JSON を返す", () => {
  const p = tmpFile();
  writeFileSync(p, JSON.stringify({ theme: "dark" }));
  assert.deepEqual(readSettings(p), { theme: "dark" });
});

test("readSettings は壊れた JSON で例外", () => {
  const p = tmpFile();
  writeFileSync(p, "{ not json");
  assert.throws(() => readSettings(p), /parse/i);
});

test("writeSettingsAtomic は内容を書き既存をバックアップ", () => {
  const p = tmpFile();
  writeFileSync(p, JSON.stringify({ theme: "dark" }));
  writeSettingsAtomic(p, { theme: "light", spinnerVerbs: { mode: "replace", verbs: ["a"] } });

  assert.deepEqual(readSettings(p), { theme: "light", spinnerVerbs: { mode: "replace", verbs: ["a"] } });
  const dir = join(p, "..");
  const backups = readdirSync(dir).filter((f) => f.startsWith("settings.json.bak-"));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, backups[0]), "utf8")), { theme: "dark" });
});

test("writeSettingsAtomic は新規作成時はバックアップなし", () => {
  const p = tmpFile();
  writeSettingsAtomic(p, { spinnerVerbs: { mode: "replace", verbs: ["a"] } });
  assert.ok(existsSync(p));
  const backups = readdirSync(join(p, "..")).filter((f) => f.startsWith("settings.json.bak-"));
  assert.equal(backups.length, 0);
});
