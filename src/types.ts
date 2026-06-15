export type Lang = "ja" | "en" | "both";
export type Mode = "replace" | "append";
export type Scope = "user" | "project";
export type VerbSet = "bootcamp" | "hiit" | "yoga" | "stiff";

export interface SpinnerVerbs {
  mode: Mode;
  verbs: string[];
}

export type Settings = Record<string, unknown>;

export interface InstallState {
  version: string;
  lang: Lang;
  set?: VerbSet;
  mode: Mode;
  scope: Scope;
  settingsPath: string;
  verbsHash: string;
  installedAt: string;
}
