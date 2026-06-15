import { homedir } from "node:os";
import { join } from "node:path";
import type { Scope } from "../types.js";

export function settingsPath(scope: Scope, cwd: string = process.cwd()): string {
  const base = scope === "user" ? homedir() : cwd;
  return join(base, ".claude", "settings.json");
}

export function statePath(): string {
  return join(homedir(), ".claude", ".claude-bootcamp.json");
}
