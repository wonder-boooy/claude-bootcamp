# claude-bootcamp 💪

Claude Code のレスポンス待ちスピナーを、運動を鼓舞するブートキャンプ調のワードに差し替えます。PC に向かう待ち時間を、軽い運動のきっかけに。

```text
スクワットしろ…
肩を回せ…
その場で足踏みしろ…
```

## 使い方

```bash
# インストール（対話で言語を選択）
npx claude-bootcamp install

# 非対話
npx claude-bootcamp install --lang ja --mode replace --yes

# 元に戻す
npx claude-bootcamp uninstall

# ワード一覧／プレビュー
npx claude-bootcamp list --lang ja
npx claude-bootcamp preview
```

インストール後、Claude Code を再起動すると反映されます。

## オプション

| オプション | 値 | デフォルト |
|---|---|---|
| `--lang` | `ja` / `en` / `both` | 対話で質問 |
| `--mode` | `replace`（置換）/ `append`（追加） | `replace` |
| `--scope` | `user`（`~/.claude`）/ `project`（`./.claude`） | `user` |
| `--yes` | 確認スキップ | false |

## 仕組み

Claude Code の [`spinnerVerbs`](https://docs.claude.com/en/docs/claude-code/settings) 設定を `settings.json` にマージします。既存設定はバックアップ（`settings.json.bak-*`）した上でアトミックに書き込み、`~/.claude/.claude-bootcamp.json` に状態を記録します。`uninstall` は当ツールが入れた値のみを除去し、手動で変更されている場合は安全のため何もしません。

## コントリビュート

ワードの追加・翻訳は `data/verbs.*.json` への PR を歓迎します（回数・数字は入れない方針です）。

## License

MIT
