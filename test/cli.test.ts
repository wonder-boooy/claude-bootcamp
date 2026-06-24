import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("source CLI は list --lang ja を実行できる", () => {
  const output = execFileSync(process.execPath, ["--import", "tsx", "src/cli.ts", "list", "--lang", "ja"], {
    encoding: "utf8",
  });

  assert.match(output, /claude-bootcamp verbs \(ja\)/);
  assert.match(output, /スクワットしろ/);
});

function runList(env: Record<string, string>): string {
  return execFileSync(process.execPath, ["--import", "tsx", "src/cli.ts", "list"], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "", LC_MESSAGES: "", LANG: "", ...env },
  });
}

test("list は英語ロケールでは en をデフォルトにする", () => {
  assert.match(runList({ LANG: "en_US.UTF-8" }), /claude-bootcamp verbs \(en\)/);
});

test("list は日本語ロケールでは ja をデフォルトにする", () => {
  assert.match(runList({ LANG: "ja_JP.UTF-8" }), /claude-bootcamp verbs \(ja\)/);
});

test("list はロケール未設定では en にフォールバックする", () => {
  assert.match(runList({}), /claude-bootcamp verbs \(en\)/);
});
