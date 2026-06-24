import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDefaultLang } from "../src/core/locale.ts";

test("日本語ロケール(ja_JP.UTF-8)は ja", () => {
  assert.equal(detectDefaultLang({ LANG: "ja_JP.UTF-8" }), "ja");
});

test("先頭が ja であれば大文字小文字を問わず ja", () => {
  assert.equal(detectDefaultLang({ LANG: "JA" }), "ja");
  assert.equal(detectDefaultLang({ LANG: "ja" }), "ja");
});

test("英語ロケールは en", () => {
  assert.equal(detectDefaultLang({ LANG: "en_US.UTF-8" }), "en");
});

test("その他の言語ロケールは英語フォールバック", () => {
  assert.equal(detectDefaultLang({ LANG: "fr_FR.UTF-8" }), "en");
  assert.equal(detectDefaultLang({ LANG: "de_DE.UTF-8" }), "en");
});

test("ロケール未設定(空)は英語フォールバック", () => {
  assert.equal(detectDefaultLang({}), "en");
  assert.equal(detectDefaultLang({ LANG: "" }), "en");
  assert.equal(detectDefaultLang({ LANG: "C" }), "en");
  assert.equal(detectDefaultLang({ LANG: "POSIX" }), "en");
});

test("LC_ALL が LC_MESSAGES と LANG より優先される", () => {
  assert.equal(
    detectDefaultLang({ LC_ALL: "ja_JP.UTF-8", LC_MESSAGES: "en_US.UTF-8", LANG: "en_US.UTF-8" }),
    "ja",
  );
});

test("LC_MESSAGES が LANG より優先される", () => {
  assert.equal(detectDefaultLang({ LC_MESSAGES: "ja_JP.UTF-8", LANG: "en_US.UTF-8" }), "ja");
});

test("引数なしでも例外を投げず ja|en を返す", () => {
  assert.ok(["ja", "en"].includes(detectDefaultLang()));
});
