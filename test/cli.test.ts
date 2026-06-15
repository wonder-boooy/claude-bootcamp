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
