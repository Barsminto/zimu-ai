import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedRules = [
  "*",
  "!index.html",
  "!app.js",
  "!app-state.js",
  "!styles.css",
  "!favicon.svg",
  "!google5c6d722e97c4c94d.html",
  "!README.md",
  "!_headers",
];

test("static asset deployment uses an explicit public-file allowlist", async () => {
  const source = await readFile(new URL("../.assetsignore", import.meta.url), "utf8");
  const rules = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  assert.deepEqual(rules, expectedRules);
  assert.equal(rules.some((rule) => rule.includes("seeds")), false);
  assert.equal(rules.some((rule) => rule.includes("tests")), false);
});
