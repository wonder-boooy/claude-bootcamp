import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Lang, VerbSet } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");

function readList(file: string): string[] {
  const raw = readFileSync(join(dataDir, file), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
    throw new Error(`Invalid verbs data: ${file}`);
  }
  return parsed;
}

export interface SetInfo {
  key: VerbSet;
  label: string;
}

/** 選択可能なワードセット。先頭がデフォルト。 */
export const SETS: SetInfo[] = [
  { key: "bootcamp", label: "ブートキャンプ" },
  { key: "hiit", label: "HIIT" },
  { key: "yoga", label: "ヨガ" },
  { key: "stiff", label: "肩こり防止" },
];

export const DEFAULT_SET: VerbSet = "bootcamp";

/** bootcamp は無印（verbs.ja.json）、それ以外はセット名付き（verbs.ja.yoga.json）。 */
function fileFor(lang: "ja" | "en", set: VerbSet): string {
  return set === "bootcamp" ? `verbs.${lang}.json` : `verbs.${lang}.${set}.json`;
}

function listFor(lang: "ja" | "en", set: VerbSet): string[] {
  return readList(fileFor(lang, set));
}

// 既存 API 互換：デフォルトセット（bootcamp）のワードを公開する。
export const jaVerbs: string[] = listFor("ja", DEFAULT_SET);
export const enVerbs: string[] = listFor("en", DEFAULT_SET);

export function loadVerbs(lang: Lang, set: VerbSet = DEFAULT_SET): string[] {
  switch (lang) {
    case "ja":
      return listFor("ja", set);
    case "en":
      return listFor("en", set);
    case "both":
      return [...listFor("ja", set), ...listFor("en", set)];
  }
}
