import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production demo seed is explicit, marked, and removable", async () => {
  const sql = await readFile(new URL("../seeds/production-demo-data.sql", import.meta.url), "utf8");
  assert.match(sql, /is_demo/);
  assert.match(sql, /'active', 1/);
  assert.match(sql, /DELETE FROM offers WHERE is_demo = 1/);
  assert.match(sql, /DELETE FROM merchants WHERE is_demo = 1/);
  assert.match(sql, /demo-.*@example\.test/);
});
