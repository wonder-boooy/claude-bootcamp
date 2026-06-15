import type { Lang, Mode, Scope, VerbSet } from "../types.js";
import { DEFAULT_SET, loadVerbs } from "../core/verbs.js";
import { applySpinnerVerbs, hashSpinnerVerbs, makeSpinnerVerbs, matchesManaged } from "../core/merge.js";
import { readSettings, writeSettingsAtomic } from "../core/settings.js";
import { writeState } from "../core/state.js";

export interface InstallOptions {
  lang: Lang;
  set?: VerbSet;
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
  const set = opts.set ?? DEFAULT_SET;
  const verbs = loadVerbs(opts.lang, set);
  const spinnerVerbs = makeSpinnerVerbs(verbs, opts.mode);
  const hash = hashSpinnerVerbs(spinnerVerbs);

  const settings = readSettings(opts.settingsPath);

  if (matchesManaged(settings, hash)) {
    return { changed: false, verbsCount: verbs.length };
  }

  const next = applySpinnerVerbs(settings, spinnerVerbs);
  writeSettingsAtomic(opts.settingsPath, next);

  writeState(opts.statePath, {
    version: "0.1.0",
    lang: opts.lang,
    set,
    mode: opts.mode,
    scope: opts.scope,
    settingsPath: opts.settingsPath,
    verbsHash: hash,
    installedAt: new Date().toISOString(),
  });

  return { changed: true, verbsCount: verbs.length };
}
