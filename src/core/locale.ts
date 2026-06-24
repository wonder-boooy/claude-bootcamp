import type { Lang } from "../types.js";

/** 判定に使う環境変数を優先度順に並べたもの（POSIX のロケール優先順位に準拠）。 */
const LOCALE_ENV_KEYS = ["LC_ALL", "LC_MESSAGES", "LANG"] as const;

/**
 * 環境ロケールから既定の言語を判定する。
 * 日本語ロケール（ja*）なら "ja"、それ以外はすべて英語 "en" にフォールバックする。
 *
 * @param env 判定に使う環境変数（既定は process.env）。テスト容易性のため注入可能。
 */
export function detectDefaultLang(env: NodeJS.ProcessEnv = process.env): Lang {
  for (const key of LOCALE_ENV_KEYS) {
    const value = env[key];
    if (value) {
      return /^ja/i.test(value) ? "ja" : "en";
    }
  }
  return "en";
}
