# Local D1 Test Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic local-only D1 test merchants and quotes, verify them with an integration test, and load them into the project's default local D1 state.

**Architecture:** Keep test data in a standalone idempotent SQL seed file that targets the existing schema. Wrangler's D1 file executor rejects SQL transaction-control statements, so every write uses an existing unique constraint for safe retries. Test it against an isolated Wrangler D1 persistence directory, then apply the same migration and seed to the default local Wrangler state.

**Tech Stack:** Cloudflare D1, Wrangler 4, SQLite SQL, Node.js built-in test runner, Web Crypto PBKDF2.

## Global Constraints

- Never use `--remote` for the seed workflow.
- Do not modify the production D1 schema.
- Use `.test` email addresses and the local-only password `LocalDemo2026!`.
- Keep every seed statement idempotent and preserve unrelated local rows.
- Seed exactly three active merchants and one pending merchant.
- Seed all four model IDs accepted by `src/index.js`.
- Do not create a Git commit unless the user explicitly requests it.

---

### Task 1: D1 Seed Integration Contract

**Files:**
- Create: `tests/d1-seed.test.mjs`
- Read: `migrations/0001_init_schema.sql`
- Read: `src/auth.js`

**Interfaces:**
- Consumes: Wrangler CLI local D1 execution and `verifyPassword(password, record)` from `src/auth.js`.
- Produces: An isolated integration test requiring four seeded users, four merchants, sixteen quotes, twelve publicly visible active quotes, and a valid demo password hash.

- [ ] **Step 1: Write the failing integration test**

Create `tests/d1-seed.test.mjs` with this integration test:

```js
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
  const { stdout } = await runWrangler(["d1", "execute", "model-market-db", "--local", "--persist-to", persistTo, "--command", sql, "--json"]);
  return JSON.parse(stdout)[0].results;
}

test("local D1 seed is idempotent and preserves review visibility", async (t) => {
  const persistTo = await mkdtemp(join(tmpdir(), "model-market-d1-"));
  t.after(() => rm(persistTo, { recursive: true, force: true }));

  await runWrangler(["d1", "execute", "model-market-db", "--local", "--persist-to", persistTo, "--file", "migrations/0001_init_schema.sql", "--yes"]);
  await runWrangler(["d1", "execute", "model-market-db", "--local", "--persist-to", persistTo, "--file", "seeds/local-test-data.sql", "--yes"]);
  await runWrangler(["d1", "execute", "model-market-db", "--local", "--persist-to", persistTo, "--file", "seeds/local-test-data.sql", "--yes"]);

  const [counts] = await query(persistTo, countSql);
  assert.deepEqual(counts, { users: 4, merchants: 4, quotes: 16, publicQuotes: 12, pendingQuotes: 4 });

  const [fixture] = await query(persistTo, "SELECT password_hash AS hash, password_salt AS salt FROM users WHERE email = 'aurora@example.test';");
  assert.equal(await verifyPassword("LocalDemo2026!", fixture), true);
  assert.equal(await verifyPassword("incorrect-password", fixture), false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/d1-seed.test.mjs
```

Expected: FAIL because `seeds/local-test-data.sql` does not exist.

---

### Task 2: Idempotent Local Seed SQL

**Files:**
- Create: `seeds/local-test-data.sql`
- Test: `tests/d1-seed.test.mjs`

**Interfaces:**
- Consumes: Existing `users`, `merchants`, and `quotes` tables and their unique constraints.
- Produces: Four local demo accounts, four merchants, and sixteen deterministic quotes without SQL transaction-control statements.

- [ ] **Step 1: Add deterministic account fixtures**

Use this PBKDF2 fixture for every local demo account:

```text
password: LocalDemo2026!
password_salt: bG9jYWwtc2VlZC0yMDI2IQ
password_hash: WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw
```

Create or update these users with an idempotent `INSERT ... ON CONFLICT(email) DO UPDATE` statement:

```text
aurora@example.test
northstar@example.test
lattice@example.test
pending@example.test
```

- [ ] **Step 2: Add merchant fixtures**

Upsert merchants by `user_id`:

```text
Aurora API      | active  | support@aurora.example.test
Northstar Relay | active  | @northstar_demo
Lattice Cloud   | active  | demo-wechat:lattice-cloud
Pending Sandbox | pending | pending@example.test
```

- [ ] **Step 3: Add quote fixtures**

For each merchant, upsert one quote for each supported model using the existing `(merchant_id, model_id)` unique constraint and this exact matrix:

| Merchant | Model | Input | Cache write | Output | Cache read | Note | Updated at |
|---|---|---:|---:|---:|---:|---|---:|
| Aurora API | `gpt-5-6` | 1250 | 1450 | 9850 | 180 | 稳定线路 · 工作日支持 | 1784793600000 |
| Aurora API | `gpt-5-6-mini` | 350 | 420 | 2200 | 80 | 适合批量轻任务 | 1784793600000 |
| Aurora API | `gpt-5-6-nano` | 90 | 120 | 650 | 25 | 低延迟共享通道 | 1784793600000 |
| Aurora API | `gpt-5-6-reasoning` | 2100 | 2350 | 12800 | 320 | 推理任务优先队列 | 1784793600000 |
| Northstar Relay | `gpt-5-6` | 1180 | 1380 | 10100 | 170 | 新用户测试额度 | 1784707200000 |
| Northstar Relay | `gpt-5-6-mini` | 320 | 390 | 2300 | 75 | 高并发线路 | 1784707200000 |
| Northstar Relay | `gpt-5-6-nano` | 85 | 110 | 690 | 22 | 适合工具调用 | 1784707200000 |
| Northstar Relay | `gpt-5-6-reasoning` | 1980 | 2280 | 13200 | 300 | 独立推理通道 | 1784707200000 |
| Lattice Cloud | `gpt-5-6` | 1320 | 1500 | 9600 | 190 | 企业工单支持 | 1784620800000 |
| Lattice Cloud | `gpt-5-6-mini` | 370 | 440 | 2100 | 85 | 按量计费无月租 | 1784620800000 |
| Lattice Cloud | `gpt-5-6-nano` | 95 | 125 | 620 | 28 | 轻量任务优化 | 1784620800000 |
| Lattice Cloud | `gpt-5-6-reasoning` | 2200 | 2450 | 12400 | 340 | 长上下文稳定线路 | 1784620800000 |
| Pending Sandbox | `gpt-5-6` | 900 | 1100 | 8000 | 100 | 待审核测试报价 | 1784534400000 |
| Pending Sandbox | `gpt-5-6-mini` | 250 | 300 | 1800 | 50 | 待审核测试报价 | 1784534400000 |
| Pending Sandbox | `gpt-5-6-nano` | 60 | 80 | 500 | 15 | 待审核测试报价 | 1784534400000 |
| Pending Sandbox | `gpt-5-6-reasoning` | 1600 | 1900 | 10500 | 220 | 待审核测试报价 | 1784534400000 |

- [ ] **Step 4: Run the integration test and verify GREEN**

Run:

```bash
node --test tests/d1-seed.test.mjs
```

Expected: PASS, including the second seed execution and password verification.

---

### Task 3: Local Workflow Documentation and Database Load

**Files:**
- Modify: `README.md:18`
- Read: `wrangler.toml`
- Read: `seeds/local-test-data.sql`

**Interfaces:**
- Consumes: The migration and seed files produced by prior tasks.
- Produces: Documented local commands and a populated default local D1 database.

- [ ] **Step 1: Document the local D1 workflow**

Add commands for migration, seeding, local Worker startup, and a warning that the seed must never use `--remote`:

```bash
npx wrangler d1 migrations apply model-market-db --local
npx wrangler d1 execute model-market-db --local --file seeds/local-test-data.sql --yes
npx wrangler dev --local --port 4186
```

Document the local demo accounts and shared password `LocalDemo2026!`.

- [ ] **Step 2: Run the complete Node test suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all tests pass with no warnings or errors.

- [ ] **Step 3: Load the default local D1 database**

Run:

```bash
npx wrangler d1 migrations apply model-market-db --local
npx wrangler d1 execute model-market-db --local --file seeds/local-test-data.sql --yes
```

Expected: migration and seed commands succeed without a remote resource warning.

- [ ] **Step 4: Verify persisted local rows**

Run a local JSON query and verify the same `4 / 4 / 16 / 12 / 4` counts used by the integration test.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the approved design, plan, seed, test, and README files are changed.
