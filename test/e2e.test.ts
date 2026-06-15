import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const cli = join(process.cwd(), "dist", "cli.js");

before(() => {
  execFileSync("npm", ["run", "build"], { stdio: "ignore" });
});

test("install --lang ja --yes で settings に日本語 verbs が入る", () => {
  const fakeHome = mkdtempSync(join(tmpdir(), "cbc-home-"));
  execFileSync("node", [cli, "install", "--lang", "ja", "--yes"], {
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
    stdio: "ignore",
  });

  const settingsFile = join(fakeHome, ".claude", "settings.json");
  assert.ok(existsSync(settingsFile));
  const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
  assert.equal(settings.spinnerVerbs.mode, "replace");
  assert.ok(settings.spinnerVerbs.verbs.includes("スクワットしろ"));

  assert.notEqual(fakeHome, homedir());
});
