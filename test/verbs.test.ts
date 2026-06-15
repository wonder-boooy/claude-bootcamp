import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVerbs, jaVerbs, enVerbs, SETS, DEFAULT_SET } from "../src/core/verbs.ts";

function assertQuality(verbs: string[], label: string, min = 20): void {
  assert.ok(verbs.length >= min, `${label}: ${min}語以上`);
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

test("SETS の先頭はデフォルト（bootcamp）", () => {
  assert.equal(SETS[0].key, DEFAULT_SET);
  assert.equal(DEFAULT_SET, "bootcamp");
});

test("loadVerbs の set 既定値は bootcamp（無印と一致）", () => {
  assert.deepEqual(loadVerbs("ja"), loadVerbs("ja", "bootcamp"));
  assert.deepEqual(loadVerbs("ja", "bootcamp"), jaVerbs);
});

test("全セットの日英ワードが品質要件を満たす", () => {
  for (const { key } of SETS) {
    const min = key === DEFAULT_SET ? 20 : 12;
    assertQuality(loadVerbs("ja", key), `ja/${key}`, min);
    assertQuality(loadVerbs("en", key), `en/${key}`, min);
    assert.equal(
      loadVerbs("ja", key).length,
      loadVerbs("en", key).length,
      `${key}: 日英の語数が一致`,
    );
  }
});

test("各セットは異なるワード集合（bootcamp と非同一）", () => {
  for (const { key } of SETS) {
    if (key === DEFAULT_SET) continue;
    assert.notDeepEqual(loadVerbs("ja", key), jaVerbs, `ja/${key} は bootcamp と異なる`);
  }
});

test("loadVerbs('both', set) はそのセットの日英を結合", () => {
  assert.deepEqual(loadVerbs("both", "yoga"), [...loadVerbs("ja", "yoga"), ...loadVerbs("en", "yoga")]);
});
