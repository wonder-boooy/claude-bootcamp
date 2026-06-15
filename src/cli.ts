#!/usr/bin/env node
import type { Lang, Mode, Scope, VerbSet } from "./types.js";
import { runInstall } from "./commands/install.js";
import { runList } from "./commands/list.js";
import { runPreview } from "./commands/preview.js";
import { runUninstall } from "./commands/uninstall.js";
import { settingsPath, statePath } from "./core/paths.js";
import { DEFAULT_SET, SETS } from "./core/verbs.js";
import { runWizard, type WizardStep } from "./prompt.js";

const LANGS: { value: Lang; label: string }[] = [
  { value: "ja", label: "ja（日本語）" },
  { value: "en", label: "en（English）" },
  { value: "both", label: "both（日英）" },
];

interface Flags {
  lang?: Lang;
  set?: VerbSet;
  mode?: Mode;
  scope?: Scope;
  yes: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--lang") flags.lang = argv[++i] as Lang;
    else if (arg === "--set") flags.set = argv[++i] as VerbSet;
    else if (arg === "--mode") flags.mode = argv[++i] as Mode;
    else if (arg === "--scope") flags.scope = argv[++i] as Scope;
  }
  return flags;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  switch (command) {
    case "install": {
      let lang: Lang = flags.lang ?? "ja";
      let set: VerbSet = flags.set ?? DEFAULT_SET;
      if (!flags.yes) {
        // 未指定のものだけをウィザードのステップにする（戻る操作で選び直せる）。
        const steps: WizardStep[] = [];
        if (flags.lang === undefined) steps.push({ question: "言語を選んでください", options: LANGS, initial: "ja" });
        if (flags.set === undefined) {
          steps.push({
            question: "セットを選んでください",
            options: SETS.map((s) => ({ value: s.key, label: s.label })),
            initial: DEFAULT_SET,
          });
        }
        if (steps.length > 0) {
          const answers = await runWizard(steps);
          let i = 0;
          if (flags.lang === undefined) lang = answers[i++] as Lang;
          if (flags.set === undefined) set = answers[i++] as VerbSet;
        }
      }
      const mode = flags.mode ?? "replace";
      const scope = flags.scope ?? "user";
      const result = runInstall({ lang, set, mode, scope, settingsPath: settingsPath(scope), statePath: statePath() });
      console.log(
        result.changed
          ? `✅ ${result.verbsCount} 語をインストールしました (lang=${lang}, set=${set}, mode=${mode}, scope=${scope})。Claude Code を再起動してください。`
          : "ℹ️  すでに最新です。変更はありません。",
      );
      break;
    }
    case "uninstall": {
      const scope = flags.scope ?? "user";
      const result = runUninstall({ settingsPath: settingsPath(scope), statePath: statePath() });
      const msg: Record<string, string> = {
        removed: "✅ 元に戻しました。",
        "not-installed": "ℹ️  インストールされていません。",
        modified: "⚠️  spinnerVerbs が手動で変更されています。安全のため何もしませんでした。手動で削除してください。",
      };
      console.log(msg[result.status]);
      break;
    }
    case "list":
      runList(flags.lang ?? "both", undefined, flags.set ?? DEFAULT_SET);
      break;
    case "preview":
      await runPreview(flags.lang ?? "ja", undefined, undefined, flags.set ?? DEFAULT_SET);
      break;
    default: {
      const sets = SETS.map((s) => s.key).join("|");
      console.log(`claude-bootcamp — Claude Code の待ち時間で軽い運動を促す

使い方:
  npx claude-bootcamp install [--lang ja|en|both] [--set ${sets}] [--mode replace|append] [--scope user|project] [--yes]
  npx claude-bootcamp uninstall [--scope user|project]
  npx claude-bootcamp list [--lang ja|en|both] [--set ${sets}]
  npx claude-bootcamp preview [--lang ja|en|both] [--set ${sets}]

セット（--set）:
${SETS.map((s) => `  ${s.key === DEFAULT_SET ? "*" : " "} ${s.key} — ${s.label}`).join("\n")}`);
    }
  }
}

main().catch((err) => {
  console.error(`エラー: ${(err as Error).message}`);
  process.exitCode = 1;
});
