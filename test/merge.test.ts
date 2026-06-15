import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeSpinnerVerbs,
  applySpinnerVerbs,
  removeSpinnerVerbs,
  hashSpinnerVerbs,
  matchesManaged,
} from "../src/core/merge.ts";
import type { Settings, SpinnerVerbs } from "../src/types.ts";

const sample: SpinnerVerbs = { mode: "replace", verbs: ["スクワットしろ", "肩を回せ"] };

test("makeSpinnerVerbs は mode と verbs を保持", () => {
  const sv = makeSpinnerVerbs(["a", "b"], "append");
  assert.deepEqual(sv, { mode: "append", verbs: ["a", "b"] });
});

test("applySpinnerVerbs は他キーを保持し非破壊", () => {
  const original: Settings = { statusLine: { type: "command" }, theme: "dark" };
  const next = applySpinnerVerbs(original, sample);
  assert.deepEqual(next.spinnerVerbs, sample);
  assert.equal(next.statusLine, original.statusLine);
  assert.equal(next.theme, "dark");
  assert.equal("spinnerVerbs" in original, false);
});

test("applySpinnerVerbs は空 settings でも動作", () => {
  const next = applySpinnerVerbs({}, sample);
  assert.deepEqual(next, { spinnerVerbs: sample });
});

test("removeSpinnerVerbs は spinnerVerbs だけ削除し非破壊", () => {
  const original: Settings = { spinnerVerbs: sample, theme: "dark" };
  const next = removeSpinnerVerbs(original);
  assert.equal("spinnerVerbs" in next, false);
  assert.equal(next.theme, "dark");
  assert.ok("spinnerVerbs" in original);
});

test("hashSpinnerVerbs は安定（同入力で同ハッシュ）", () => {
  assert.equal(hashSpinnerVerbs(sample), hashSpinnerVerbs({ ...sample, verbs: [...sample.verbs] }));
});

test("hashSpinnerVerbs は内容が変われば変化", () => {
  assert.notEqual(hashSpinnerVerbs(sample), hashSpinnerVerbs({ mode: "append", verbs: sample.verbs }));
});

test("matchesManaged は現 settings がハッシュ一致か判定", () => {
  const settings: Settings = { spinnerVerbs: sample };
  assert.equal(matchesManaged(settings, hashSpinnerVerbs(sample)), true);
  assert.equal(matchesManaged({}, hashSpinnerVerbs(sample)), false);
  assert.equal(matchesManaged({ spinnerVerbs: { mode: "append", verbs: ["x"] } }, hashSpinnerVerbs(sample)), false);
});
