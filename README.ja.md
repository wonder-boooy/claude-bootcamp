# claude-bootcamp 💪

[English](https://github.com/wonder-boooy/claude-bootcamp/blob/main/README.md) | **日本語**

Claude Code のレスポンス待ちスピナーを、運動を鼓舞するブートキャンプ調のワードに差し替えます。PC に向かう待ち時間を、軽い運動のきっかけに。

```text
スクワットしろ…
肩を回せ…
その場で足踏みしろ…
```

ワードは**セット**で切り替えられます。気分や体調に合わせてどうぞ。

| セット | 雰囲気 | 例 |
|---|---|---|
| `bootcamp`（デフォルト） | ブートキャンプ調の運動命令 | スクワットしろ／肩を回せ |
| `hiit` | 高強度・その場で全力 | しゃがんで跳び上がれ／腿を高く上げて走れ |
| `yoga` | 呼吸とポーズでゆっくり | 猫のように背中を丸めろ／深く息を吸い込め |
| `stiff` | 肩こり防止・デスクワーク向け | 肩を後ろに大きく回せ／画面から目を離して遠くを見ろ |
| `hulk` | ジムでないと無理な本格筋トレ | ベンチで100kgを押し上げろ／タイヤをひっくり返せ |

## 使い方

```bash
# インストール（対話で「言語」と「セット」を選択）
npx claude-bootcamp install

# 非対話（セットも指定可能）
npx claude-bootcamp install --lang ja --set yoga --mode replace --yes

# 元に戻す
npx claude-bootcamp uninstall

# ワード一覧／プレビュー（セット指定で導入前に確認できる）
npx claude-bootcamp list --lang ja --set hiit
npx claude-bootcamp preview --set stiff
```

`install` の対話は**ウィザード形式**です。1 画面に 1 ステップずつ（言語 → セット）表示し、`↑↓`（`j`/`k`・数字キーでも可）でカーソル（`*`）を動かして `Enter` で次へ進みます。`←`（または `Backspace`）で前のステップに戻って選び直せます。

```text
[2/2] セットを選んでください（↑↓ 移動 / ← 戻る / Enter 決定）
* ブートキャンプ
  HIIT
  ヨガ
  肩こり防止
  HULK
```

ターミナル以外（CI・パイプ）では自動的に番号入力にフォールバックします。インストール後、Claude Code を再起動すると反映されます。

## オプション

| オプション | 値 | デフォルト |
|---|---|---|
| `--lang` | `ja` / `en` / `both` | 環境ロケールから自動判定（`ja*` なら `ja`、それ以外は `en`）。`install` の対話では判定結果が初期選択 |
| `--set` | `bootcamp` / `hiit` / `yoga` / `stiff` / `hulk` | 対話で質問（`bootcamp`） |
| `--mode` | `replace`（置換）/ `append`（追加） | `replace` |
| `--scope` | `user`（`~/.claude`）/ `project`（`./.claude`） | `user` |
| `--yes` | 確認スキップ | false |

## 仕組み

Claude Code の [`spinnerVerbs`](https://docs.claude.com/en/docs/claude-code/settings) 設定を `settings.json` にマージします。既存設定はバックアップ（`settings.json.bak-*`）した上でアトミックに書き込み、`~/.claude/.claude-bootcamp.json` に状態を記録します。`uninstall` は当ツールが入れた値のみを除去し、手動で変更されている場合は安全のため何もしません。

## コントリビュート

ワードの追加・翻訳は `data/verbs.*.json` への PR を歓迎します（回数・数字は入れない方針です）。

- `bootcamp`（デフォルト）: `data/verbs.ja.json` / `data/verbs.en.json`
- その他のセット: `data/verbs.<lang>.<set>.json`（例: `data/verbs.ja.yoga.json`）

新しいセットを足す場合は、日英 2 ファイルを用意し、`src/core/verbs.ts` の `SETS` と `src/types.ts` の `VerbSet` に追記してください。基本方針は「読んだ瞬間に何をすべきか分かる、回数なしの具体的な動作」です。`hulk` のみ重量（kg）の具体的な数字を入れる例外とします。

## License

MIT
