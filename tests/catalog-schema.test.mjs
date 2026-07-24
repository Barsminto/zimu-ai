import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../", import.meta.url));

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

test("catalog schema supports two offer slots and required lifecycle fields", async (t) => {
  const persistTo = await mkdtemp(join(tmpdir(), "model-market-schema-"));
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
    "migrations/0002_catalog_offers_admin.sql",
    "--yes",
  ]);

  const [columns] = await query(
    persistTo,
    "SELECT (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'role') AS user_role, (SELECT COUNT(*) FROM pragma_table_info('offers') WHERE name IN ('channel_slot', 'status')) AS offer_fields, (SELECT COUNT(*) FROM pragma_table_info('audit_logs') WHERE name = 'snapshot_json') AS audit_snapshot;",
  );
  assert.deepEqual(columns, { user_role: 1, offer_fields: 2, audit_snapshot: 1 });

  await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    "INSERT INTO users (email, password_hash, password_salt, role, created_at) VALUES ('schema@example.test', 'hash', 'salt', 'merchant', 1); INSERT INTO merchants (user_id, name, status, created_at, updated_at) SELECT id, 'Schema Merchant', 'active', 1, 1 FROM users WHERE email = 'schema@example.test'; INSERT INTO brands (slug, name, status, created_at, updated_at) VALUES ('schema-brand', 'Schema Brand', 'active', 1, 1); INSERT INTO models (id, brand_id, slug, name, status, created_at, updated_at) SELECT 'schema-model', id, 'schema-model', 'Schema Model', 'active', 1, 1 FROM brands WHERE slug = 'schema-brand'; INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, created_at, updated_at) SELECT id, 'schema-model', 1, 'Primary', 'primary@example.test', 1, 2, 3, 4, 'active', 1, 1 FROM merchants WHERE name = 'Schema Merchant'; INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, created_at, updated_at) SELECT id, 'schema-model', 2, 'Backup', 'backup@example.test', 5, 6, 7, 8, 'active', 1, 1 FROM merchants WHERE name = 'Schema Merchant';",
    "--yes",
  ]);

  await assert.rejects(
    () => runWrangler([
      "d1",
      "execute",
      "model-market-db",
      "--local",
      "--persist-to",
      persistTo,
      "--command",
      "INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, created_at, updated_at) SELECT id, 'schema-model', 3, 'Invalid', 1, 1, 1, 1, 'active', 1, 1 FROM merchants WHERE name = 'Schema Merchant';",
      "--yes",
    ]),
    /constraint|CHECK|UNIQUE/i,
  );
});
