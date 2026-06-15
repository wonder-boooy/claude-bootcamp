import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { InstallState } from "../types.js";

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
