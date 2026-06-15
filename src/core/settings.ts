import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Settings } from "../types.js";

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
