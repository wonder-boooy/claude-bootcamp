import { test } from "node:test";
import assert from "node:assert/strict";
import { runList } from "../src/commands/list.ts";
import { runPreview } from "../src/commands/preview.ts";

test("runList は指定言語のワード一覧を出力", () => {
  const lines: string[] = [];
  runList("ja", (s) => lines.push(s));

  assert.match(lines[0], /claude-bootcamp verbs \(ja\)/);
  assert.ok(lines.some((line) => line.includes("スクワットしろ")));
});

test("runList は set 指定でヘッダに lang/set を出し、そのセットのワードを出力", () => {
  const lines: string[] = [];
  runList("ja", (s) => lines.push(s), "yoga");

  assert.match(lines[0], /claude-bootcamp verbs \(ja\/yoga\)/);
  assert.ok(lines.some((line) => line.includes("猫のように背中を丸めろ")));
  assert.ok(!lines.some((line) => line.includes("スクワットしろ")));
});

test("runPreview は rounds=0 で終了メッセージを出力", async () => {
  let output = "";
  await runPreview("ja", 0, (s) => {
    output += s;
  });

  assert.match(output, /さあ、動こう！/);
});
