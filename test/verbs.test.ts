import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVerbs, jaVerbs, enVerbs } from "../src/core/verbs.ts";

function assertQuality(verbs: string[], label: string): void {
  assert.ok(verbs.length >= 20, `${label}: 20語以上`);
  assert.equal(new Set(verbs).size, verbs.length, `${label}: 重複なし`);
  for (const v of verbs) {
    assert.ok(v.trim().length > 0, `${label}: 空文字なし`);
    assert.ok(!/[0-9０-９]/.test(v), `${label}: 数字/回数を含まない -> "${v}"`);
  }
}

test("日本語ワードは品質要件を満たす", () => {
  assertQuality(jaVerbs, "ja");
});

test("英語ワードは品質要件を満たす", () => {
  assertQuality(enVerbs, "en");
});

test("loadVerbs('ja') は日本語のみ", () => {
  assert.deepEqual(loadVerbs("ja"), jaVerbs);
});

test("loadVerbs('en') は英語のみ", () => {
  assert.deepEqual(loadVerbs("en"), enVerbs);
});

test("loadVerbs('both') は日英を結合", () => {
  assert.deepEqual(loadVerbs("both"), [...jaVerbs, ...enVerbs]);
});
