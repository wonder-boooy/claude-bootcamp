import { matchesManaged, removeSpinnerVerbs } from "../core/merge.js";
import { readSettings, writeSettingsAtomic } from "../core/settings.js";
import { clearState, readState } from "../core/state.js";

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
    return { status: "modified" };
  }

  writeSettingsAtomic(opts.settingsPath, removeSpinnerVerbs(settings));
  clearState(opts.statePath);
  return { status: "removed" };
}
