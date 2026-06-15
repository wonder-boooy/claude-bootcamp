import { createHash } from "node:crypto";
import type { Mode, Settings, SpinnerVerbs } from "../types.js";

export function makeSpinnerVerbs(verbs: string[], mode: Mode): SpinnerVerbs {
  return { mode, verbs: [...verbs] };
}

export function applySpinnerVerbs(settings: Settings, spinnerVerbs: SpinnerVerbs): Settings {
  return { ...settings, spinnerVerbs };
}

export function removeSpinnerVerbs(settings: Settings): Settings {
  const next = { ...settings };
  delete next.spinnerVerbs;
  return next;
}

export function hashSpinnerVerbs(spinnerVerbs: SpinnerVerbs): string {
  const canonical = JSON.stringify({ mode: spinnerVerbs.mode, verbs: spinnerVerbs.verbs });
  return createHash("sha256").update(canonical).digest("hex");
}

export function matchesManaged(settings: Settings, expectedHash: string): boolean {
  const current = settings.spinnerVerbs;
  if (!isSpinnerVerbs(current)) return false;
  return hashSpinnerVerbs(current) === expectedHash;
}

function isSpinnerVerbs(value: unknown): value is SpinnerVerbs {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.mode === "replace" || v.mode === "append") &&
    Array.isArray(v.verbs) &&
    v.verbs.every((x) => typeof x === "string")
  );
}
