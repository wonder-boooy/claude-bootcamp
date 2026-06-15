import type { Lang, VerbSet } from "../types.js";
import { DEFAULT_SET, loadVerbs } from "../core/verbs.js";

const FRAMES = ["", ".", "..", "..."];

// set は後方互換のため末尾の任意引数。
export async function runPreview(
  lang: Lang,
  rounds = 6,
  write: (s: string) => void = (s) => process.stdout.write(s),
  set: VerbSet = DEFAULT_SET,
): Promise<void> {
  const verbs = loadVerbs(lang, set);
  for (let i = 0; i < rounds; i++) {
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    for (const frame of FRAMES) {
      write(`\r\x1b[K  ✊ ${verb}${frame}`);
      await sleep(180);
    }
  }
  write("\r\x1b[K  さあ、動こう！\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
