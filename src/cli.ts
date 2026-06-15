#!/usr/bin/env node
import type { Lang, Mode, Scope } from "./types.js";
import { runInstall } from "./commands/install.js";
import { runList } from "./commands/list.js";
import { runPreview } from "./commands/preview.js";
import { runUninstall } from "./commands/uninstall.js";
import { settingsPath, statePath } from "./core/paths.js";
import { choose } from "./prompt.js";

interface Flags {
  lang?: Lang;
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
      const lang: Lang =
        flags.lang ?? (flags.yes ? "ja" : await choose<Lang>("言語を選んでください", ["ja", "en", "both"], "ja"));
      const mode = flags.mode ?? "replace";
      const scope = flags.scope ?? "user";
      const result = runInstall({ lang, mode, scope, settingsPath: settingsPath(scope), statePath: statePath() });
      console.log(
        result.changed
          ? `✅ ${result.verbsCount} 語をインストールしました (lang=${lang}, mode=${mode}, scope=${scope})。Claude Code を再起動してください。`
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
      runList(flags.lang ?? "both");
      break;
    case "preview":
      await runPreview(flags.lang ?? "ja");
      break;
    default:
      console.log(`claude-bootcamp — Claude Code の待ち時間で軽い運動を促す

使い方:
  npx claude-bootcamp install [--lang ja|en|both] [--mode replace|append] [--scope user|project] [--yes]
  npx claude-bootcamp uninstall [--scope user|project]
  npx claude-bootcamp list [--lang ja|en|both]
  npx claude-bootcamp preview [--lang ja|en|both]`);
  }
}

main().catch((err) => {
  console.error(`エラー: ${(err as Error).message}`);
  process.exitCode = 1;
});
