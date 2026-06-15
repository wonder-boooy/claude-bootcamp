# claude-bootcamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code のレスポンス待ちスピナーを「運動を鼓舞する命令形ワード」に差し替える `npx claude-bootcamp` CLI を作り、OSS として配布する。

**Architecture:** Node.js(ESM)+TypeScript。`core/` に副作用のない純粋関数（verbs 組み立て・settings マージ・冪等判定）とファイル I/O を分離。`commands/` が CLI 各サブコマンドを担い、`cli.ts` が引数を解釈して振り分ける。`spinnerVerbs` 設定を `~/.claude/settings.json`（または project スコープ）へアトミックかつ非破壊にマージし、管理ファイルで原状復帰を可能にする。

**Tech Stack:** Node 18+, TypeScript (tsc), Node 標準 `node:test` / `node:assert`、依存ゼロ志向（外部ランタイム依存なし）。

---

## File Structure

```
package.json                  # type:module, bin, scripts, files
tsconfig.json
.gitignore
data/
  verbs.ja.json               # 日本語ワード配列
  verbs.en.json               # 英語ワード配列
src/
  types.ts                    # 共有型 (Lang, Mode, Scope, SpinnerVerbs, Settings, InstallState)
  core/
    verbs.ts                  # data/*.json のロードと言語結合
    merge.ts                  # spinnerVerbs 組み立て・適用・除去・ハッシュ・冪等判定（純粋関数）
    paths.ts                  # user/project スコープのパス解決
    settings.ts              # settings.json 読み/アトミック書き/バックアップ
    state.ts                  # 管理ファイルの読み書き
  commands/
    install.ts
    uninstall.ts
    list.ts
    preview.ts
  prompt.ts                   # 最小の対話 UI
  cli.ts                      # エントリ：引数解釈→各コマンドへ振り分け
test/
  verbs.test.ts
  merge.test.ts
  paths.test.ts
  settings.test.ts
  state.test.ts
  install.test.ts
  uninstall.test.ts
  e2e.test.ts
README.md
LICENSE
.github/workflows/ci.yml
```

実行時、`dist/core/verbs.js` から見て data はパッケージルートの `data/`。`import.meta.url` で `../../data` を解決する。

---

## Task 1: プロジェクトの足場

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/types.ts`

- [ ] **Step 1: `.gitignore` を作成**

```
node_modules/
dist/
*.bak-*
```

- [ ] **Step 2: `package.json` を作成**

```json
{
  "name": "claude-bootcamp",
  "version": "0.1.0",
  "description": "Turn Claude Code's waiting spinner into a workout drill sergeant.",
  "type": "module",
  "license": "MIT",
  "bin": {
    "claude-bootcamp": "./dist/cli.js"
  },
  "files": [
    "dist",
    "data",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsc",
    "test": "node --test --import tsx test/",
    "prepublishOnly": "npm run build"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0"
  }
}
```

注: ランタイム依存はゼロ。`tsx` は test/build 用の devDependency のみ（`node --test --import tsx` で TS テストを直接実行）。

- [ ] **Step 3: `tsconfig.json` を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": false,
    "sourceMap": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: `src/types.ts` を作成**

```typescript
export type Lang = "ja" | "en" | "both";
export type Mode = "replace" | "append";
export type Scope = "user" | "project";

export interface SpinnerVerbs {
  mode: Mode;
  verbs: string[];
}

export type Settings = Record<string, unknown>;

export interface InstallState {
  version: string;
  lang: Lang;
  mode: Mode;
  scope: Scope;
  settingsPath: string;
  verbsHash: string;
  installedAt: string;
}
```

- [ ] **Step 5: 依存をインストールしてビルドが通ることを確認**

Run: `npm install && npm run build`
Expected: エラーなく終了。`dist/types.js` が生成される。

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore src/types.ts package-lock.json
git commit -m "chore: プロジェクトの足場と共有型を追加"
```

---

## Task 2: ワードデータと verbs ローダー

**Files:**
- Create: `data/verbs.ja.json`
- Create: `data/verbs.en.json`
- Create: `src/core/verbs.ts`
- Test: `test/verbs.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/verbs.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVerbs, jaVerbs, enVerbs } from "../src/core/verbs.ts";

function assertQuality(verbs: string[], label: string): void {
  assert.ok(verbs.length >= 20, `${label}: 20語以上`);
  assert.equal(new Set(verbs).size, verbs.length, `${label}: 重複なし`);
  for (const v of verbs) {
    assert.ok(v.trim().length > 0, `${label}: 空文字なし`);
    assert.ok(!/[0-9０-９]/.test(v), `${label}: 数字/回数を含まない -> "${v}"`);
  }
}

test("日本語ワードは品質要件を満たす", () => {
  assertQuality(jaVerbs, "ja");
});

test("英語ワードは品質要件を満たす", () => {
  assertQuality(enVerbs, "en");
});

test("loadVerbs('ja') は日本語のみ", () => {
  assert.deepEqual(loadVerbs("ja"), jaVerbs);
});

test("loadVerbs('en') は英語のみ", () => {
  assert.deepEqual(loadVerbs("en"), enVerbs);
});

test("loadVerbs('both') は日英を結合", () => {
  assert.deepEqual(loadVerbs("both"), [...jaVerbs, ...enVerbs]);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/core/verbs.ts` が存在しない）

- [ ] **Step 3: データファイルを作成**

`data/verbs.ja.json`（具体的な運動の命令形・回数なし・器具なし）:

```json
[
  "スクワットしろ",
  "肩を回せ",
  "その場で足踏みしろ",
  "椅子で背筋を伸ばせ",
  "かかとを上げ下げしろ",
  "腕を大きく回せ",
  "体を左右にひねれ",
  "立って前屈しろ",
  "首をゆっくり回せ",
  "つま先立ちになれ",
  "両腕を上に伸ばせ",
  "太ももを上げろ",
  "肩甲骨を寄せろ",
  "ふくらはぎを伸ばせ",
  "手首を回せ",
  "大きく胸を開け",
  "立ち上がって深呼吸しろ",
  "背中を反らせ",
  "脇腹を伸ばせ",
  "両肩をすくめて落とせ",
  "膝を抱えてバランスを取れ",
  "壁を押して腕立てしろ",
  "踏み台昇降しろ",
  "首を左右に倒せ"
]
```

`data/verbs.en.json`:

```json
[
  "Do squats",
  "Roll your shoulders",
  "March in place",
  "Sit up straight",
  "Raise your heels",
  "Circle your arms",
  "Twist your torso",
  "Stand and bend",
  "Stretch your neck",
  "Rise on your toes",
  "Reach up high",
  "Lift your knees",
  "Squeeze your shoulder blades",
  "Stretch your calves",
  "Roll your wrists",
  "Open your chest",
  "Stand and breathe deep",
  "Arch your back",
  "Stretch your sides",
  "Shrug and drop your shoulders",
  "Balance on one leg",
  "Push off the wall",
  "Step up and down",
  "Tilt your head side to side"
]
```

- [ ] **Step 4: `src/core/verbs.ts` を作成**

```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Lang } from "../types.ts";

const here = dirname(fileURLToPath(import.meta.url));
// dist/core/verbs.js または src/core/verbs.ts のどちらからでも data/ はパッケージルート
const dataDir = join(here, "..", "..", "data");

function readList(file: string): string[] {
  const raw = readFileSync(join(dataDir, file), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
    throw new Error(`Invalid verbs data: ${file}`);
  }
  return parsed as string[];
}

export const jaVerbs: string[] = readList("verbs.ja.json");
export const enVerbs: string[] = readList("verbs.en.json");

export function loadVerbs(lang: Lang): string[] {
  switch (lang) {
    case "ja":
      return [...jaVerbs];
    case "en":
      return [...enVerbs];
    case "both":
      return [...jaVerbs, ...enVerbs];
  }
}
```

注: テストは `src/core/verbs.ts` を直接 import するため、`data/` は `src/core` から見て `../../data`。ビルド後の `dist/core` からも同じ相対で解決できる。

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test`
Expected: PASS（5 テスト）

- [ ] **Step 6: Commit**

```bash
git add data/ src/core/verbs.ts test/verbs.test.ts
git commit -m "feat: 運動ワードデータとローダーを追加"
```

---

## Task 3: spinnerVerbs マージ純粋関数

**Files:**
- Create: `src/core/merge.ts`
- Test: `test/merge.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/merge.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeSpinnerVerbs,
  applySpinnerVerbs,
  removeSpinnerVerbs,
  hashSpinnerVerbs,
  matchesManaged,
} from "../src/core/merge.ts";
import type { Settings, SpinnerVerbs } from "../src/types.ts";

const sample: SpinnerVerbs = { mode: "replace", verbs: ["スクワットしろ", "肩を回せ"] };

test("makeSpinnerVerbs は mode と verbs を保持", () => {
  const sv = makeSpinnerVerbs(["a", "b"], "append");
  assert.deepEqual(sv, { mode: "append", verbs: ["a", "b"] });
});

test("applySpinnerVerbs は他キーを保持し非破壊", () => {
  const original: Settings = { statusLine: { type: "command" }, theme: "dark" };
  const next = applySpinnerVerbs(original, sample);
  assert.deepEqual(next.spinnerVerbs, sample);
  assert.equal(next.statusLine, original.statusLine);
  assert.equal(next.theme, "dark");
  // 元オブジェクトは変更されない
  assert.equal("spinnerVerbs" in original, false);
});

test("applySpinnerVerbs は空 settings でも動作", () => {
  const next = applySpinnerVerbs({}, sample);
  assert.deepEqual(next, { spinnerVerbs: sample });
});

test("removeSpinnerVerbs は spinnerVerbs だけ削除し非破壊", () => {
  const original: Settings = { spinnerVerbs: sample, theme: "dark" };
  const next = removeSpinnerVerbs(original);
  assert.equal("spinnerVerbs" in next, false);
  assert.equal(next.theme, "dark");
  assert.ok("spinnerVerbs" in original); // 元は不変
});

test("hashSpinnerVerbs は安定（同入力で同ハッシュ）", () => {
  assert.equal(hashSpinnerVerbs(sample), hashSpinnerVerbs({ ...sample, verbs: [...sample.verbs] }));
});

test("hashSpinnerVerbs は内容が変われば変化", () => {
  assert.notEqual(hashSpinnerVerbs(sample), hashSpinnerVerbs({ mode: "append", verbs: sample.verbs }));
});

test("matchesManaged は現 settings がハッシュ一致か判定", () => {
  const settings: Settings = { spinnerVerbs: sample };
  assert.equal(matchesManaged(settings, hashSpinnerVerbs(sample)), true);
  assert.equal(matchesManaged({}, hashSpinnerVerbs(sample)), false);
  assert.equal(matchesManaged({ spinnerVerbs: { mode: "append", verbs: ["x"] } }, hashSpinnerVerbs(sample)), false);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/core/merge.ts` が存在しない）

- [ ] **Step 3: `src/core/merge.ts` を作成**

```typescript
import { createHash } from "node:crypto";
import type { Mode, Settings, SpinnerVerbs } from "../types.ts";

export function makeSpinnerVerbs(verbs: string[], mode: Mode): SpinnerVerbs {
  return { mode, verbs: [...verbs] };
}

export function applySpinnerVerbs(settings: Settings, spinnerVerbs: SpinnerVerbs): Settings {
  return { ...settings, spinnerVerbs };
}

export function removeSpinnerVerbs(settings: Settings): Settings {
  const next = { ...settings };
  delete next.spinnerVerbs;
  return next;
}

export function hashSpinnerVerbs(spinnerVerbs: SpinnerVerbs): string {
  const canonical = JSON.stringify({ mode: spinnerVerbs.mode, verbs: spinnerVerbs.verbs });
  return createHash("sha256").update(canonical).digest("hex");
}

export function matchesManaged(settings: Settings, expectedHash: string): boolean {
  const current = settings.spinnerVerbs;
  if (!isSpinnerVerbs(current)) return false;
  return hashSpinnerVerbs(current) === expectedHash;
}

function isSpinnerVerbs(value: unknown): value is SpinnerVerbs {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.mode === "replace" || v.mode === "append") &&
    Array.isArray(v.verbs) &&
    v.verbs.every((x) => typeof x === "string")
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/merge.ts test/merge.test.ts
git commit -m "feat: spinnerVerbs マージ純粋関数を追加"
```

---

## Task 4: スコープのパス解決

**Files:**
- Create: `src/core/paths.ts`
- Test: `test/paths.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/paths.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { settingsPath, statePath } from "../src/core/paths.ts";

test("user スコープは ~/.claude/settings.json", () => {
  assert.equal(settingsPath("user"), join(homedir(), ".claude", "settings.json"));
});

test("project スコープは cwd/.claude/settings.json", () => {
  assert.equal(settingsPath("project", "/tmp/proj"), join("/tmp/proj", ".claude", "settings.json"));
});

test("statePath は ~/.claude/.claude-bootcamp.json", () => {
  assert.equal(statePath(), join(homedir(), ".claude", ".claude-bootcamp.json"));
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/core/paths.ts` が存在しない）

- [ ] **Step 3: `src/core/paths.ts` を作成**

```typescript
import { homedir } from "node:os";
import { join } from "node:path";
import type { Scope } from "../types.ts";

export function settingsPath(scope: Scope, cwd: string = process.cwd()): string {
  const base = scope === "user" ? homedir() : cwd;
  return join(base, ".claude", "settings.json");
}

export function statePath(): string {
  return join(homedir(), ".claude", ".claude-bootcamp.json");
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/paths.ts test/paths.test.ts
git commit -m "feat: スコープのパス解決を追加"
```

---

## Task 5: settings.json のファイル I/O

**Files:**
- Create: `src/core/settings.ts`
- Test: `test/settings.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/settings.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSettings, writeSettingsAtomic } from "../src/core/settings.ts";

function tmpFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return join(dir, "settings.json");
}

test("readSettings は存在しなければ空オブジェクト", () => {
  assert.deepEqual(readSettings(tmpFile()), {});
});

test("readSettings は既存 JSON を返す", () => {
  const p = tmpFile();
  writeFileSync(p, JSON.stringify({ theme: "dark" }));
  assert.deepEqual(readSettings(p), { theme: "dark" });
});

test("readSettings は壊れた JSON で例外", () => {
  const p = tmpFile();
  writeFileSync(p, "{ not json");
  assert.throws(() => readSettings(p), /parse/i);
});

test("writeSettingsAtomic は内容を書き既存をバックアップ", () => {
  const p = tmpFile();
  writeFileSync(p, JSON.stringify({ theme: "dark" }));
  writeSettingsAtomic(p, { theme: "light", spinnerVerbs: { mode: "replace", verbs: ["a"] } });

  assert.deepEqual(readSettings(p), { theme: "light", spinnerVerbs: { mode: "replace", verbs: ["a"] } });
  const dir = join(p, "..");
  const backups = readdirSync(dir).filter((f) => f.startsWith("settings.json.bak-"));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, backups[0]), "utf8")), { theme: "dark" });
});

test("writeSettingsAtomic は新規作成時はバックアップなし", () => {
  const p = tmpFile();
  writeSettingsAtomic(p, { spinnerVerbs: { mode: "replace", verbs: ["a"] } });
  assert.ok(existsSync(p));
  const backups = readdirSync(join(p, "..")).filter((f) => f.startsWith("settings.json.bak-"));
  assert.equal(backups.length, 0);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/core/settings.ts` が存在しない）

- [ ] **Step 3: `src/core/settings.ts` を作成**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import type { Settings } from "../types.ts";

export function readSettings(path: string): Settings {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${(err as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Failed to parse ${path}: not a JSON object`);
  }
  return parsed as Settings;
}

export function writeSettingsAtomic(path: string, settings: Settings): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });

  if (existsSync(path)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    copyFileSync(path, join(dir, `${basename(path)}.bak-${stamp}`));
  }

  const tmp = join(dir, `${basename(path)}.tmp-${process.pid}`);
  writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/settings.ts test/settings.test.ts
git commit -m "feat: settings.json のアトミック読み書きを追加"
```

---

## Task 6: 管理ファイル（state）の読み書き

**Files:**
- Create: `src/core/state.ts`
- Test: `test/state.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/state.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, writeState, clearState } from "../src/core/state.ts";
import type { InstallState } from "../src/types.ts";

function tmpStatePath(): string {
  return join(mkdtempSync(join(tmpdir(), "cbc-")), ".claude-bootcamp.json");
}

const sample: InstallState = {
  version: "0.1.0",
  lang: "ja",
  mode: "replace",
  scope: "user",
  settingsPath: "/home/x/.claude/settings.json",
  verbsHash: "abc",
  installedAt: "2026-06-15T00:00:00.000Z",
};

test("readState は存在しなければ null", () => {
  assert.equal(readState(tmpStatePath()), null);
});

test("write→read で往復する", () => {
  const p = tmpStatePath();
  writeState(p, sample);
  assert.deepEqual(readState(p), sample);
});

test("readState は壊れた JSON で null（フォールバック）", () => {
  const p = tmpStatePath();
  writeFileSync(p, "{ broken");
  assert.equal(readState(p), null);
});

test("clearState は削除する", () => {
  const p = tmpStatePath();
  writeState(p, sample);
  clearState(p);
  assert.equal(readState(p), null);
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/core/state.ts` が存在しない）

- [ ] **Step 3: `src/core/state.ts` を作成**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import type { InstallState } from "../types.ts";

export function readState(path: string): InstallState | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as InstallState;
  } catch {
    return null;
  }
}

export function writeState(path: string, state: InstallState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function clearState(path: string): void {
  rmSync(path, { force: true });
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts test/state.test.ts
git commit -m "feat: 管理ファイルの読み書きを追加"
```

---

## Task 7: install コマンド

**Files:**
- Create: `src/commands/install.ts`
- Test: `test/install.test.ts`

`install` は I/O を引数で受け取れる形にして、テスト時に一時パスを注入する。

- [ ] **Step 1: 失敗するテストを書く**

`test/install.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall } from "../src/commands/install.ts";
import { readSettings } from "../src/core/settings.ts";
import { readState } from "../src/core/state.ts";
import { jaVerbs } from "../src/core/verbs.ts";

function ctx() {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return {
    settingsPath: join(dir, "settings.json"),
    statePath: join(dir, ".claude-bootcamp.json"),
    dir,
  };
}

test("install は日本語 verbs を replace で書き、state を残す", () => {
  const c = ctx();
  const result = runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });

  assert.equal(result.changed, true);
  const settings = readSettings(c.settingsPath);
  assert.deepEqual(settings.spinnerVerbs, { mode: "replace", verbs: jaVerbs });

  const state = readState(c.statePath);
  assert.equal(state?.lang, "ja");
  assert.equal(state?.settingsPath, c.settingsPath);
});

test("install は既存の他キーを保持", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, JSON.stringify({ theme: "dark" }));
  runInstall({ lang: "en", mode: "append", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });

  const settings = readSettings(c.settingsPath);
  assert.equal(settings.theme, "dark");
  assert.equal((settings.spinnerVerbs as { mode: string }).mode, "append");
});

test("install は冪等（2回目は changed:false）", () => {
  const c = ctx();
  const opts = { lang: "ja" as const, mode: "replace" as const, scope: "user" as const, settingsPath: c.settingsPath, statePath: c.statePath };
  runInstall(opts);
  const second = runInstall(opts);
  assert.equal(second.changed, false);
  // 2回目はバックアップを作らない
  const backups = readdirSync(c.dir).filter((f) => f.includes(".bak-"));
  assert.equal(backups.length, 0);
});

test("install は壊れた settings で中断し書き換えない", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, "{ broken");
  assert.throws(
    () => runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath }),
    /parse/i,
  );
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/commands/install.ts` が存在しない）

- [ ] **Step 3: `src/commands/install.ts` を作成**

```typescript
import type { Lang, Mode, Scope } from "../types.ts";
import { loadVerbs } from "../core/verbs.ts";
import { makeSpinnerVerbs, applySpinnerVerbs, hashSpinnerVerbs, matchesManaged } from "../core/merge.ts";
import { readSettings, writeSettingsAtomic } from "../core/settings.ts";
import { writeState } from "../core/state.ts";

export interface InstallOptions {
  lang: Lang;
  mode: Mode;
  scope: Scope;
  settingsPath: string;
  statePath: string;
}

export interface InstallResult {
  changed: boolean;
  verbsCount: number;
}

export function runInstall(opts: InstallOptions): InstallResult {
  const verbs = loadVerbs(opts.lang);
  const spinnerVerbs = makeSpinnerVerbs(verbs, opts.mode);
  const hash = hashSpinnerVerbs(spinnerVerbs);

  const settings = readSettings(opts.settingsPath); // 壊れていれば例外で中断

  if (matchesManaged(settings, hash)) {
    return { changed: false, verbsCount: verbs.length };
  }

  const next = applySpinnerVerbs(settings, spinnerVerbs);
  writeSettingsAtomic(opts.settingsPath, next);

  writeState(opts.statePath, {
    version: "0.1.0",
    lang: opts.lang,
    mode: opts.mode,
    scope: opts.scope,
    settingsPath: opts.settingsPath,
    verbsHash: hash,
    installedAt: new Date().toISOString(),
  });

  return { changed: true, verbsCount: verbs.length };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/install.ts test/install.test.ts
git commit -m "feat: install コマンドのコアロジックを追加"
```

---

## Task 8: uninstall コマンド

**Files:**
- Create: `src/commands/uninstall.ts`
- Test: `test/uninstall.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/uninstall.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall } from "../src/commands/install.ts";
import { runUninstall } from "../src/commands/uninstall.ts";
import { readSettings } from "../src/core/settings.ts";
import { readState } from "../src/core/state.ts";

function ctx() {
  const dir = mkdtempSync(join(tmpdir(), "cbc-"));
  return { settingsPath: join(dir, "settings.json"), statePath: join(dir, ".claude-bootcamp.json") };
}

test("uninstall はツール導入値を除去し他キーを残す", () => {
  const c = ctx();
  writeFileSync(c.settingsPath, JSON.stringify({ theme: "dark" }));
  runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });

  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "removed");

  const settings = readSettings(c.settingsPath);
  assert.equal("spinnerVerbs" in settings, false);
  assert.equal(settings.theme, "dark");
  assert.equal(readState(c.statePath), null);
});

test("uninstall は state が無ければ no-op", () => {
  const c = ctx();
  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "not-installed");
});

test("uninstall は手動改変を検知して中断（消さない）", () => {
  const c = ctx();
  runInstall({ lang: "ja", mode: "replace", scope: "user", settingsPath: c.settingsPath, statePath: c.statePath });
  // ユーザーが手で書き換えた
  writeFileSync(c.settingsPath, JSON.stringify({ spinnerVerbs: { mode: "replace", verbs: ["自作"] } }));

  const result = runUninstall({ settingsPath: c.settingsPath, statePath: c.statePath });
  assert.equal(result.status, "modified");
  const settings = readSettings(c.settingsPath);
  assert.deepEqual(settings.spinnerVerbs, { mode: "replace", verbs: ["自作"] });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`../src/commands/uninstall.ts` が存在しない）

- [ ] **Step 3: `src/commands/uninstall.ts` を作成**

```typescript
import { readSettings, writeSettingsAtomic } from "../core/settings.ts";
import { readState, clearState } from "../core/state.ts";
import { matchesManaged, removeSpinnerVerbs } from "../core/merge.ts";

export interface UninstallOptions {
  settingsPath: string;
  statePath: string;
}

export type UninstallStatus = "removed" | "not-installed" | "modified";

export interface UninstallResult {
  status: UninstallStatus;
}

export function runUninstall(opts: UninstallOptions): UninstallResult {
  const state = readState(opts.statePath);
  if (!state) return { status: "not-installed" };

  const settings = readSettings(opts.settingsPath);

  if (!matchesManaged(settings, state.verbsHash)) {
    // ユーザーが手で書き換えた → 勝手に消さない
    return { status: "modified" };
  }

  writeSettingsAtomic(opts.settingsPath, removeSpinnerVerbs(settings));
  clearState(opts.statePath);
  return { status: "removed" };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/uninstall.ts test/uninstall.test.ts
git commit -m "feat: uninstall コマンドのコアロジックを追加"
```

---

## Task 9: list / preview コマンド

**Files:**
- Create: `src/commands/list.ts`
- Create: `src/commands/preview.ts`

これらは標準出力への表示のみ（純粋ロジックは Task 2 で検証済み）。

- [ ] **Step 1: `src/commands/list.ts` を作成**

```typescript
import type { Lang } from "../types.ts";
import { loadVerbs } from "../core/verbs.ts";

export function runList(lang: Lang, log: (s: string) => void = console.log): void {
  const verbs = loadVerbs(lang);
  log(`claude-bootcamp verbs (${lang}) — ${verbs.length} 語`);
  for (const v of verbs) log(`  • ${v}`);
}
```

- [ ] **Step 2: `src/commands/preview.ts` を作成**

```typescript
import type { Lang } from "../types.ts";
import { loadVerbs } from "../core/verbs.ts";

const FRAMES = ["", ".", "..", "..."];

export async function runPreview(lang: Lang, rounds = 6, write: (s: string) => void = (s) => process.stdout.write(s)): Promise<void> {
  const verbs = loadVerbs(lang);
  for (let i = 0; i < rounds; i++) {
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    for (const f of FRAMES) {
      write(`\r\x1b[K  ✊ ${verb}${f}`);
      await sleep(180);
    }
  }
  write("\r\x1b[K  さあ、動こう！\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/commands/list.ts src/commands/preview.ts
git commit -m "feat: list / preview コマンドを追加"
```

---

## Task 10: 対話プロンプトと CLI 配線

**Files:**
- Create: `src/prompt.ts`
- Create: `src/cli.ts`

- [ ] **Step 1: `src/prompt.ts` を作成**

```typescript
import { createInterface } from "node:readline/promises";

export async function choose<T extends string>(question: string, choices: T[], fallback: T): Promise<T> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const list = choices.map((c, i) => `  ${i + 1}) ${c}`).join("\n");
    const answer = (await rl.question(`${question}\n${list}\n> `)).trim();
    const idx = Number.parseInt(answer, 10) - 1;
    return choices[idx] ?? (choices.includes(answer as T) ? (answer as T) : fallback);
  } finally {
    rl.close();
  }
}
```

- [ ] **Step 2: `src/cli.ts` を作成**

```typescript
#!/usr/bin/env node
import type { Lang, Mode, Scope } from "./types.ts";
import { runInstall } from "./commands/install.ts";
import { runUninstall } from "./commands/uninstall.ts";
import { runList } from "./commands/list.ts";
import { runPreview } from "./commands/preview.ts";
import { settingsPath, statePath } from "./core/paths.ts";
import { choose } from "./prompt.ts";

interface Flags {
  lang?: Lang;
  mode?: Mode;
  scope?: Scope;
  yes: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") flags.yes = true;
    else if (a === "--lang") flags.lang = argv[++i] as Lang;
    else if (a === "--mode") flags.mode = argv[++i] as Mode;
    else if (a === "--scope") flags.scope = argv[++i] as Scope;
  }
  return flags;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  switch (command) {
    case "install": {
      const lang = flags.lang ?? (flags.yes ? "ja" : await choose("言語を選んでください", ["ja", "en", "both"], "ja"));
      const mode = flags.mode ?? "replace";
      const scope = flags.scope ?? "user";
      const result = runInstall({ lang, mode, scope, settingsPath: settingsPath(scope), statePath: statePath() });
      console.log(result.changed
        ? `✅ ${result.verbsCount} 語をインストールしました (lang=${lang}, mode=${mode}, scope=${scope})。Claude Code を再起動してください。`
        : `ℹ️  すでに最新です。変更はありません。`);
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
```

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: エラーなし。`dist/cli.js` が生成される。

- [ ] **Step 4: 手動スモーク（一時 HOME で実行）**

Run: `npm run build && node dist/cli.js list --lang ja`
Expected: 日本語ワードが一覧表示される

- [ ] **Step 5: Commit**

```bash
git add src/prompt.ts src/cli.ts
git commit -m "feat: 対話プロンプトと CLI エントリを配線"
```

---

## Task 11: E2E テスト

**Files:**
- Test: `test/e2e.test.ts`

ビルド済み `dist/cli.js` を子プロセスで実行し、実際に settings へ書き込まれることを検証する。

- [ ] **Step 1: E2E テストを書く**

`test/e2e.test.ts`:

```typescript
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const cli = join(process.cwd(), "dist", "cli.js");

before(() => {
  execFileSync("npm", ["run", "build"], { stdio: "ignore" });
});

test("install --lang ja --yes で settings に日本語 verbs が入る", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "cbc-home-"));
  execFileSync("node", [cli, "install", "--lang", "ja", "--yes"], {
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
    stdio: "ignore",
  });

  const settingsFile = join(fakeHome, ".claude", "settings.json");
  assert.ok(existsSync(settingsFile));
  const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
  assert.equal(settings.spinnerVerbs.mode, "replace");
  assert.ok(settings.spinnerVerbs.verbs.includes("スクワットしろ"));

  // 自分の実 HOME は汚さない
  assert.notEqual(fakeHome, homedir());
});
```

注: `paths.ts` は `os.homedir()` を使う。`homedir()` は `HOME`（Windows は `USERPROFILE`）を参照するため、env で差し替えれば実ホームを汚さない。

- [ ] **Step 2: テストが通ることを確認**

Run: `npm test`
Expected: PASS（全テスト緑）

- [ ] **Step 3: Commit**

```bash
git add test/e2e.test.ts
git commit -m "test: install の E2E テストを追加"
```

---

## Task 12: ドキュメント・ライセンス・CI

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: `LICENSE`（MIT）を作成**

```
MIT License

Copyright (c) 2026 yuma.wada

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: `README.md` を作成**

````markdown
# claude-bootcamp 💪

Claude Code のレスポンス待ちスピナーを、運動を鼓舞するブートキャンプ調のワードに差し替えます。PC に向かう待ち時間を、軽い運動のきっかけに。

```
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
````

- [ ] **Step 3: `.github/workflows/ci.yml` を作成**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test
```

- [ ] **Step 4: 全テストとビルドが通ることを確認**

Run: `npm run build && npm test`
Expected: PASS（全テスト緑）、ビルド成功

- [ ] **Step 5: Commit**

```bash
git add README.md LICENSE .github/workflows/ci.yml
git commit -m "docs: README・MIT ライセンス・CI を追加"
```

---

## 完了後（手動）

- `npm publish`（初回は `npm login` 後 `npm publish --access public`）
- GitHub にリポジトリを作成して push（`gh repo create` 等）
- `npx claude-bootcamp install` を実機で確認し、Claude Code 再起動でスピナーが運動ワードになることを確認
