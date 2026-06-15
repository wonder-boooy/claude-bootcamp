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
