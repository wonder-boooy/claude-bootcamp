import { createInterface } from "node:readline/promises";

export async function choose<T extends string>(question: string, choices: T[], fallback: T): Promise<T> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const list = choices.map((choice, i) => `  ${i + 1}) ${choice}`).join("\n");
    const answer = (await rl.question(`${question}\n${list}\n> `)).trim();
    const idx = Number.parseInt(answer, 10) - 1;
    return choices[idx] ?? (choices.includes(answer as T) ? (answer as T) : fallback);
  } finally {
    rl.close();
  }
}
