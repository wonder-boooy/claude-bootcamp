import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderLabeledList,
  resolveLabeledChoice,
  renderCursorList,
  wizardReduce,
  type LabeledOption,
  type WizardState,
} from "../src/prompt.ts";

const opts: LabeledOption<"bootcamp" | "hiit" | "yoga">[] = [
  { value: "bootcamp", label: "ブートキャンプ" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "ヨガ" },
];

test("renderLabeledList はデフォルトに * を付ける", () => {
  const lines = renderLabeledList(opts, "bootcamp").split("\n");
  assert.match(lines[0], /\*\s+1\) ブートキャンプ/);
  assert.match(lines[1], /^\s{2,}2\) HIIT/);
  assert.ok(!lines[1].includes("*"));
});

test("renderCursorList はカーソル行だけに * を付ける", () => {
  const lines = renderCursorList(opts, 1).split("\n");
  assert.equal(lines[0], "  ブートキャンプ");
  assert.equal(lines[1], "* HIIT");
  assert.equal(lines[2], "  ヨガ");
  assert.equal(lines.filter((l) => l.startsWith("*")).length, 1);
});

test("renderCursorList は先頭/末尾のカーソルも表現できる", () => {
  assert.ok(renderCursorList(opts, 0).startsWith("* ブートキャンプ"));
  assert.ok(renderCursorList(opts, 2).split("\n")[2].startsWith("* ヨガ"));
});

test("resolveLabeledChoice: 番号で選べる", () => {
  assert.equal(resolveLabeledChoice("2", opts, "bootcamp"), "hiit");
});

test("resolveLabeledChoice: 空入力はデフォルト", () => {
  assert.equal(resolveLabeledChoice("", opts, "yoga"), "yoga");
  assert.equal(resolveLabeledChoice("   ", opts, "yoga"), "yoga");
});

test("resolveLabeledChoice: キー文字列でも選べる", () => {
  assert.equal(resolveLabeledChoice("yoga", opts, "bootcamp"), "yoga");
});

test("resolveLabeledChoice: 範囲外・不正入力はデフォルトにフォールバック", () => {
  assert.equal(resolveLabeledChoice("9", opts, "bootcamp"), "bootcamp");
  assert.equal(resolveLabeledChoice("nope", opts, "hiit"), "hiit");
});

// --- wizardReduce（ウィザードの状態遷移）---
const SIZES = [3, 4]; // 2 ステップ（言語 3 / セット 4 など）
const init = (): WizardState => ({ step: 0, cursors: [0, 0], done: false });

test("wizardReduce: down/up はカーソルを循環移動", () => {
  let s = wizardReduce(init(), SIZES, "down");
  assert.deepEqual([s.step, s.cursors], [0, [1, 0]]);
  s = wizardReduce({ step: 0, cursors: [0, 0], done: false }, SIZES, "up");
  assert.equal(s.cursors[0], 2); // 0 から上で末尾へ循環
});

test("wizardReduce: forward で次ステップへ、最終で done", () => {
  const s1 = wizardReduce(init(), SIZES, "forward");
  assert.deepEqual([s1.step, s1.done], [1, false]);
  const s2 = wizardReduce(s1, SIZES, "forward");
  assert.equal(s2.done, true); // 最終ステップで forward → 完了
});

test("wizardReduce: back は先頭では何もせず、2 ステップ目からは戻る", () => {
  assert.equal(wizardReduce(init(), SIZES, "back").step, 0);
  const atSecond: WizardState = { step: 1, cursors: [1, 2], done: false };
  const back = wizardReduce(atSecond, SIZES, "back");
  assert.equal(back.step, 0);
  assert.deepEqual(back.cursors, [1, 2]); // 戻ってもカーソル位置は保持（選び直せる）
});

test("wizardReduce: 元の state を破壊しない（イミュータブル）", () => {
  const s = init();
  wizardReduce(s, SIZES, "down");
  assert.deepEqual(s.cursors, [0, 0]);
});
