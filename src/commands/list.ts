import type { Lang } from "../types.js";
import { loadVerbs } from "../core/verbs.js";

export function runList(lang: Lang, log: (s: string) => void = console.log): void {
  const verbs = loadVerbs(lang);
  log(`claude-bootcamp verbs (${lang}) — ${verbs.length} 語`);
  for (const v of verbs) log(`  • ${v}`);
}
