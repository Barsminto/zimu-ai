import test from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const demoHash = "WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw";
const demoSalt = "bG9jYWwtc2VlZC0yMDI2IQ";

async function runWrangler(args) {
  return execFileAsync("npx", ["wrangler", ...args], {
    cwd: repoRoot,
    env: { ...process.env, CI: "1" },
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function seedDatabase(persistTo) {
  for (const file of ["migrations/0001_init_schema.sql", "migrations/0002_catalog_offers_admin.sql"]) {
    await runWrangler(["d1", "execute", "model-market-db", "--local", "--persist-to", persistTo, "--file", file, "--yes"]);
  }
  await runWrangler([
    "d1",
    "execute",
    "model-market-db",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    `INSERT INTO users (email, password_hash, password_salt, role, created_at) VALUES ('merchant-api@example.test', '${demoHash}', '${demoSalt}', 'merchant', 1), ('admin-api@example.test', '${demoHash}', '${demoSalt}', 'admin', 1); INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at) SELECT id, 'API Merchant', 'merchant-api@example.test', 'active', 1, 1 FROM users WHERE email = 'merchant-api@example.test'; INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at) SELECT id, 'API Admin', 'admin-api@example.test', 'active', 1, 1 FROM users WHERE email = 'admin-api@example.test';`,
    "--yes",
  ]);
}

function startWorker(persistTo, port) {
  const child = spawn("npx", [
    "wrangler",
    "dev",
    "--local",
    "--port",
    String(port),
    "--persist-to",
    persistTo,
    "--var",
    "IP_HASH_SECRET:test-ip-secret",
    "--var",
    "TURNSTILE_SECRET:test-turnstile-secret",
  ], { cwd: repoRoot, env: { ...process.env, CI: "1" } });

  const ready = new Promise((resolve, reject) => {
    let output = "";
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes("Ready on http://localhost:")) resolve();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code && !output.includes("Ready on http://localhost:")) reject(new Error(output));
    });
  });

  return { child, ready };
}

async function jsonRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  return { response, data: await response.json().catch(() => ({})) };
}

async function login(baseUrl, email) {
  const { response, data } = await jsonRequest(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "LocalDemo2026!" }) });
  assert.equal(response.status, 200, JSON.stringify(data));
  return response.headers.get("set-cookie").split(";")[0];
}

test("Worker API supports dynamic catalog, two offers, and admin authorization", async (t) => {
  const persistTo = await mkdtemp(join(tmpdir(), "model-market-worker-"));
  const port = 4300 + Math.floor(Math.random() * 500);
  await seedDatabase(persistTo);
  const worker = startWorker(persistTo, port);
  t.after(async () => {
    worker.child.kill("SIGINT");
    await rm(persistTo, { recursive: true, force: true });
  });
  await worker.ready;
  const baseUrl = `http://127.0.0.1:${port}`;

  const catalog = await jsonRequest(baseUrl, "/api/catalog");
  assert.equal(catalog.response.status, 200);
  assert.ok(catalog.data.brands.some((brand) => brand.slug === "openai"));
  assert.ok(catalog.data.models.some((model) => model.id === "gpt-5-6"));

  const forbidden = await jsonRequest(baseUrl, "/api/admin/overview");
  assert.equal(forbidden.response.status, 403);

  const merchantCookie = await login(baseUrl, "merchant-api@example.test");
  const offerPayload = (channelSlot) => ({ modelId: "gpt-5-6", channelSlot, channelName: `Channel ${channelSlot}`, channelContact: `channel-${channelSlot}@example.test`, channelUrl: "https://example.test", channelRegion: "global", channelCurrency: "CNY", channelNote: "API test", inputPrice: 1, cacheWritePrice: 2, outputPrice: 3, cacheReadPrice: 4 });
  const first = await jsonRequest(baseUrl, "/api/merchant/offers", { method: "POST", headers: { Cookie: merchantCookie }, body: JSON.stringify(offerPayload(1)) });
  assert.equal(first.response.status, 201, JSON.stringify(first.data));
  const second = await jsonRequest(baseUrl, "/api/merchant/offers", { method: "POST", headers: { Cookie: merchantCookie }, body: JSON.stringify(offerPayload(2)) });
  assert.equal(second.response.status, 201, JSON.stringify(second.data));
  const third = await jsonRequest(baseUrl, "/api/merchant/offers", { method: "POST", headers: { Cookie: merchantCookie }, body: JSON.stringify(offerPayload(3)) });
  assert.equal(third.response.status, 409);

  const publicQuotes = await jsonRequest(baseUrl, "/api/quotes?model=gpt-5-6");
  assert.equal(publicQuotes.response.status, 200);
  assert.equal(publicQuotes.data.quotes.length, 2);

  const adminCookie = await login(baseUrl, "admin-api@example.test");
  const overview = await jsonRequest(baseUrl, "/api/admin/overview", { headers: { Cookie: adminCookie } });
  assert.equal(overview.response.status, 200);
  const brand = await jsonRequest(baseUrl, "/api/admin/brands", { method: "POST", headers: { Cookie: adminCookie }, body: JSON.stringify({ slug: "api-brand", name: "API Brand" }) });
  assert.equal(brand.response.status, 201, JSON.stringify(brand.data));
});
