import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Lang } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");

function readList(file: string): string[] {
  const raw = readFileSync(join(dataDir, file), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
    throw new Error(`Invalid verbs data: ${file}`);
  }
  return parsed;
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
