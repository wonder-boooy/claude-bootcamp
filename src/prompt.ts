import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";

export interface LabeledOption<T extends string> {
  value: T;
  label: string;
}

/** デフォルトに `*` を付けた番号付き一覧（非 TTY フォールバック用・純粋関数）。 */
export function renderLabeledList<T extends string>(options: LabeledOption<T>[], fallback: T): string {
  return options.map((opt, i) => `  ${opt.value === fallback ? "*" : " "} ${i + 1}) ${opt.label}`).join("\n");
}

/** 入力（番号 / キー文字列 / 空＝デフォルト）を選択値に解決する（純粋関数）。 */
export function resolveLabeledChoice<T extends string>(answer: string, options: LabeledOption<T>[], fallback: T): T {
  const trimmed = answer.trim();
  if (trimmed === "") return fallback;
  const idx = Number.parseInt(trimmed, 10) - 1;
  if (idx >= 0 && idx < options.length) return options[idx].value;
  const byValue = options.find((opt) => opt.value === trimmed);
  return byValue ? byValue.value : fallback;
}

/** カーソル位置に `*` を付けた選択 UI の 1 フレームを組み立てる（純粋関数）。 */
export function renderCursorList<T extends string>(options: LabeledOption<T>[], cursor: number): string {
  return options.map((opt, i) => `${i === cursor ? "*" : " "} ${opt.label}`).join("\n");
}

function indexOfValue<T extends string>(options: LabeledOption<T>[], value: T): number {
  const i = options.findIndex((opt) => opt.value === value);
  return i < 0 ? 0 : i;
}

export interface WizardStep {
  question: string;
  options: LabeledOption<string>[];
  initial: string;
}

export interface WizardState {
  step: number;
  cursors: number[];
  done: boolean;
}

export type WizardAction = "up" | "down" | "back" | "forward";

/**
 * ウィザードの状態遷移（純粋関数）。
 * - up/down: 現在ステップのカーソルを循環移動
 * - back: 先頭以外なら前ステップへ（カーソル位置は保持＝選び直せる）
 * - forward: 最終ステップなら done、そうでなければ次ステップへ
 */
export function wizardReduce(state: WizardState, sizes: number[], action: WizardAction): WizardState {
  const { step, cursors } = state;
  const size = sizes[step];
  const next = { step, cursors: [...cursors], done: false };
  switch (action) {
    case "up":
      next.cursors[step] = (cursors[step] - 1 + size) % size;
      break;
    case "down":
      next.cursors[step] = (cursors[step] + 1) % size;
      break;
    case "back":
      if (step > 0) next.step = step - 1;
      break;
    case "forward":
      if (step < sizes.length - 1) next.step = step + 1;
      else next.done = true;
      break;
  }
  return next;
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && typeof process.stdin.setRawMode === "function");
}

/** 非 TTY（CI・パイプ）向け：各ステップを順に番号入力で選ぶ（戻る操作はなし）。 */
async function runWizardByNumber(steps: WizardStep[]): Promise<string[]> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const out: string[] = [];
    for (const s of steps) {
      const answer = await rl.question(`${s.question}\n${renderLabeledList(s.options, s.initial)}\n> `);
      out.push(resolveLabeledChoice(answer, s.options, s.initial));
    }
    return out;
  } finally {
    rl.close();
  }
}

/** TTY 向け：1 画面に 1 ステップずつ描き、↑↓ 移動・← 戻る・Enter 決定で進めるウィザード。 */
function runWizardInteractive(steps: WizardStep[]): Promise<string[]> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const sizes = steps.map((s) => s.options.length);
  let state: WizardState = { step: 0, cursors: steps.map((s) => indexOfValue(s.options, s.initial)), done: false };
  let prevLines = 0;

  emitKeypressEvents(stdin);
  const wasRaw = stdin.isRaw ?? false;
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write("\x1b[?25l"); // カーソル非表示

  const draw = (): void => {
    if (prevLines > 0) stdout.write(`\x1b[${prevLines}A`); // 直前ステップの先頭へ戻る
    stdout.write("\x1b[0J"); // そこから下を消去（＝積み上げない）
    const s = steps[state.step];
    const total = steps.length;
    const pos = `[${state.step + 1}/${total}]`;
    const hint = state.step > 0 ? "↑↓ 移動 / ← 戻る / Enter 決定" : "↑↓ 移動 / Enter 決定";
    stdout.write(`${pos} ${s.question}（${hint}）\n${renderCursorList(s.options, state.cursors[state.step])}\n`);
    prevLines = s.options.length + 1;
  };
  draw();

  return new Promise<string[]>((resolve) => {
    const cleanup = (): void => {
      stdin.off("keypress", onKey);
      stdout.write("\x1b[?25h"); // カーソル再表示
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };
    const apply = (action: WizardAction): void => {
      state = wizardReduce(state, sizes, action);
      if (state.done) {
        cleanup();
        resolve(state.cursors.map((c, i) => steps[i].options[c].value));
      } else {
        draw();
      }
    };
    const onKey = (_str: string, key: { name?: string; ctrl?: boolean; sequence?: string }): void => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(130);
      } else if (key.name === "up" || key.name === "k") {
        apply("up");
      } else if (key.name === "down" || key.name === "j") {
        apply("down");
      } else if (key.name === "left" || key.name === "backspace" || key.name === "h") {
        apply("back");
      } else if (key.name === "return" || key.name === "enter" || key.name === "right") {
        apply("forward");
      } else if (key.sequence && /^[1-9]$/.test(key.sequence)) {
        const i = Number(key.sequence) - 1;
        if (i < steps[state.step].options.length) {
          state = { ...state, cursors: state.cursors.map((c, idx) => (idx === state.step ? i : c)) };
          draw();
        }
      }
    };
    stdin.on("keypress", onKey);
  });
}

/**
 * 複数ステップを順に選ばせ、各ステップの選択値を配列で返す。
 * TTY なら戻る操作つきのウィザード UI、非 TTY なら番号入力にフォールバックする。
 */
export function runWizard(steps: WizardStep[]): Promise<string[]> {
  if (steps.length === 0) return Promise.resolve([]);
  return isInteractive() ? runWizardInteractive(steps) : runWizardByNumber(steps);
}
