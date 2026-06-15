# claude-bootcamp — 設計仕様

- **日付**: 2026-06-15
- **ステータス**: 承認済み（実装プラン作成へ）
- **パッケージ名**: `claude-bootcamp`

## 1. 目的と背景

PC に向かう時間はノンアクティブになりがち。Claude Code のレスポンス待ち時間に表示されるスピナーの文言を、**ビリー隊長（ブートキャンプ調）の運動を鼓舞する命令形ワード**に差し替え、軽い運動を促す。これを OSS として配布する。

Claude Code の `spinnerVerbs` 設定（`settings.json`）を活用する。スピナーは待機中に動詞を高速ランダム表示し、末尾にアニメーションの「…」を付ける。これを運動ワードに置き換える。

## 2. スコープ

### やること
- `spinnerVerbs` のみを使う（`tips` は使わない）
- 日本語・英語の運動ワードリストを同梱し、インストール時に選択
- ユーザーの `settings.json` を安全にマージ／復帰する `npx` CLI を提供

### やらないこと（YAGNI）
- `spinnerTipsOverride` / `showTurnDuration` 等の他設定の操作
- 回数・秒数を含む指示（表示時間が不定のため）
- 抽象的な精神論ワード（「限界を超えろ」等。何をすべきか分からないため不可）
- Claude Code プラグイン形式（`spinnerVerbs` は settings フィールドのため配布不可）

## 3. ワード設計（プロダクトの中身）

**方針**: 回数なし・器具なし・席や立ってすぐできる、**具体的な運動を名指しする命令形**。読んだ瞬間に何をすべきか像を結ぶ短い動作名＋部位に統一する。

**データ構造**（言語別に分離 → 翻訳・語追加をコード変更なしの PR で受け付け可能）

```
data/
  verbs.ja.json   → ["スクワットしろ", "肩を回せ", ...]
  verbs.en.json   → ["Do squats", "Roll your shoulders", ...]
```

各言語 **20〜30 語**。ランダム選出なので 20〜30 で十分に飽きにくい。

### 日本語サンプル
スクワットしろ / 肩を回せ / その場で足踏みしろ / 椅子で背筋を伸ばせ / かかとを上げ下げしろ / 腕を大きく回せ / 体を左右にひねれ / 立って前屈しろ / 首をゆっくり回せ / つま先立ちになれ / 両腕を上に伸ばせ / 太ももを上げろ / 肩甲骨を寄せろ / ふくらはぎを伸ばせ / 手首を回せ / 大きく胸を開け

### 英語サンプル
Do squats / Roll your shoulders / March in place / Sit up straight / Raise your heels / Circle your arms / Twist your torso / Stand and bend / Stretch your neck / Rise on your toes / Reach up high / Lift your knees / Squeeze your shoulder blades / Stretch your calves / Roll your wrists / Open your chest

## 4. CLI 仕様

```
npx claude-bootcamp install           # 対話で言語/モードを選び settings にマージ
npx claude-bootcamp install --lang ja --mode replace --yes   # 非対話
npx claude-bootcamp uninstall         # ツールが入れた verbs だけ除去し原状復帰
npx claude-bootcamp list [--lang ja]  # 同梱ワードを一覧表示（導入せず確認）
npx claude-bootcamp preview           # スピナー風に数語アニメ表示（おまけ）
```

### オプション

| オプション | 値 | デフォルト | 意味 |
|---|---|---|---|
| `--lang` | `ja` / `en` / `both` | 対話で質問 | 入れるワードの言語 |
| `--mode` | `replace` / `append` | `replace` | 既存デフォルト動詞を置換するか追加するか |
| `--scope` | `user` / `project` | `user` | `~/.claude/settings.json` か `./.claude/settings.json` |
| `--yes` | flag | false | 確認スキップ（非対話/CI） |

`--mode replace` をデフォルトにする理由: 世界観への没入。`append` は混ぜたい人向けに残す。

## 5. settings マージ／復帰の安全設計

外部依存（jq 等）を使わず Node 内で JSON を読み書きする。

### install フロー
1. 対象 `settings.json` を読む（無ければ `{}` から開始）。**JSON パース失敗時は中断**して通知（破損させない）
2. バックアップ作成：`settings.json.bak-<timestamp>`
3. `spinnerVerbs` を組み立てて書き込む：
   ```json
   { "spinnerVerbs": { "mode": "replace", "verbs": ["スクワットしろ", "..."] } }
   ```
4. 原状復帰用の状態を**管理ファイル** `~/.claude/.claude-bootcamp.json` に保存（導入した言語・mode・書き込んだ値のハッシュ）。settings 本体にはスキーマ外の独自キーを混ぜない
5. 書き込みは**アトミック**（一時ファイルに書いて `rename`）

### 冪等性
- 再実行時、既存 `spinnerVerbs` がツール導入値と一致すれば何もしない。言語/mode 変更時のみ上書き

### uninstall フロー
- 管理ファイルを参照し、現在の `spinnerVerbs` がツール導入値のままかを確認
  - 一致 → `spinnerVerbs` キーを削除して原状復帰、管理ファイルも削除
  - ユーザーが手動改変 → **勝手に消さず警告して中断**（ユーザーの変更を尊重）

## 6. 技術スタックとプロジェクト構成

- **Node.js (ESM) + TypeScript**、Node 18+ 想定
- **依存ゼロ志向**（引数パース・対話プロンプトは最小自前実装、外部依存はサプライチェーン最小化のため避ける）
- **ビルド**: `tsc` で `dist/` 出力、`bin` から起動

```
package.json            # bin, files, exports
src/
  cli.ts                # エントリ：引数解釈→各コマンドへ振り分け
  commands/
    install.ts
    uninstall.ts
    list.ts
    preview.ts
  core/
    settings.ts         # settings.json の読み/アトミック書き/バックアップ
    merge.ts            # spinnerVerbs 組み立て・冪等判定（純粋関数・副作用なし）
    state.ts            # 管理ファイルの読み書き
    paths.ts            # user/project スコープのパス解決
    verbs.ts            # data/*.json のロードと検証
  prompt.ts             # 対話 UI（最小実装）
data/
  verbs.ja.json
  verbs.en.json
test/
README.md  LICENSE(MIT)  .github/workflows/ci.yml
```

`core/merge.ts` は**入力（現 settings＋選択）→ 出力（新 settings）の純粋関数**として切り出し、ファイル I/O と分離する。元オブジェクトは変更せず新オブジェクトを返す（イミュータブル）。

## 7. テスト方針

TDD（RED→GREEN→リファクタ）、カバレッジ 80% 以上目標。ランナーは Node 標準 `node:test`。

### ユニットテスト
- `merge.ts`：空 settings に `replace`/`append` で正しい `spinnerVerbs` 生成 / 他キー（`statusLine` 等）を保持して非破壊 / 冪等（2 回適用で不変・「変更なし」検出）/ 元オブジェクト非変更
- `verbs.ts`：data JSON が空でない・重複なし・**数字/回数を含まない**（リスト品質を保証）
- `state.ts`：管理ファイルの読み書き・破損時フォールバック
- `paths.ts`：user/project スコープのパス解決

### 統合テスト（一時ディレクトリで実ファイル操作）
- `install` → settings.json 生成＋バックアップ＋管理ファイル生成
- 既存 settings ありで他キー保持
- JSON パース失敗時に中断し**書き込まない**
- `uninstall`：ツール導入値なら原状復帰／手動改変ありなら警告して中断
- アトミック書き込み（一時ファイル→rename）

### E2E（最小 1 本）
- 実 CLI を子プロセスで起動：`install --lang ja --yes` → settings に日本語 verbs が入ることを検証

## 8. 配布

- npm publish（`npx claude-bootcamp` で実行可能に）
- MIT ライセンス
- CI（GitHub Actions）で lint / test / build
- README に `curl | bash` 補助導線を併記する案は任意（将来）
