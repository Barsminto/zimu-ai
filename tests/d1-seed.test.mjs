import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { verifyPassword } from "../src/auth.js";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const countSql = `SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@example.test') AS users,
  (SELECT COUNT(*) FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email LIKE '%@example.test') AS merchants,
  (SELECT COUNT(*) FROM quotes q JOIN merchants m ON m.id = q.merchant_id JOIN users u ON u.id = m.user_id WHERE u.email LIKE '%@example.test') AS quotes,
  (SELECT COUNT(*) FROM quotes q JOIN merchants m ON m.id = q.merchant_id JOIN users u ON u.id = m.user_id WHERE u.email LIKE '%@example.test' AND m.status = 'active') AS publicQuotes,
  (SELECT COUNT(*) FROM quotes q JOIN merchants m ON m.id = q.merchant_id JOIN users u ON u.id = m.user_id WHERE u.email LIKE '%@example.test' AND m.status = 'pending') AS pendingQuotes;`;

async function runWrangler(args) {
  return execFileAsync("npx", ["wrangler", ...args], {
    cwd: repoRoot,
    env: { ...process.env, CI: "1" },
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function query(persistTo, sql) {
  const { stdout } = await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    sql,
    "--json",
  ]);
  return JSON.parse(stdout)[0].results;
}

test("local D1 seed is idempotent and preserves review visibility", async (t) => {
  const persistTo = await mkdtemp(join(tmpdir(), "model-market-d1-"));
  t.after(() => rm(persistTo, { recursive: true, force: true }));

  await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--file",
    "migrations/0001_init_schema.sql",
    "--yes",
  ]);
  await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--file",
    "seeds/local-test-data.sql",
    "--yes",
  ]);
  await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--file",
    "seeds/local-test-data.sql",
    "--yes",
  ]);

  const [counts] = await query(persistTo, countSql);
  assert.deepEqual(counts, { users: 4, merchants: 4, quotes: 16, publicQuotes: 12, pendingQuotes: 4 });

  const [fixture] = await query(
    persistTo,
    "SELECT password_hash AS hash, password_salt AS salt FROM users WHERE email = 'aurora@example.test';",
  );
  assert.equal(await verifyPassword("LocalDemo2026!", fixture), true);
  assert.equal(await verifyPassword("incorrect-password", fixture), false);
});
