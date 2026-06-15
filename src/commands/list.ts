import type { Lang, VerbSet } from "../types.js";
import { DEFAULT_SET, loadVerbs } from "../core/verbs.js";

// set は後方互換のため末尾の任意引数。デフォルトセット時はヘッダを (lang) のままにする。
export function runList(lang: Lang, log: (s: string) => void = console.log, set: VerbSet = DEFAULT_SET): void {
  const verbs = loadVerbs(lang, set);
  const tag = set === DEFAULT_SET ? lang : `${lang}/${set}`;
  log(`claude-bootcamp verbs (${tag}) — ${verbs.length} 語`);
  for (const v of verbs) log(`  • ${v}`);
}
