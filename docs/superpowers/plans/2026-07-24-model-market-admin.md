# Model Market Admin and Dual-Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded single-quote market with a bilingual D1-backed catalog, merchant-managed two-channel offers, and a role-protected admin console.

**Architecture:** Extend the current Cloudflare Worker + D1 application in place. Brands and models become database records; offers replace the one-row merchant/model quote relationship and enforce two channel slots with a database unique constraint. The browser remains a static asset client, while all authorization and lifecycle decisions stay in `src/index.js`.

**Tech Stack:** Cloudflare Workers, D1/SQLite, Wrangler 4, native browser JavaScript, Node.js built-in tests, existing PBKDF2 session authentication.

## Global Constraints

- One merchant/model pair has at most two channel offers.
- Merchant registration and price changes are immediate after validation; no approval workflow.
- Hide is reversible soft deletion; delete is physical deletion after confirmation.
- Only admins can create, edit, hide, restore, or delete brands and models.
- Admin accounts are never created by public registration.
- Public APIs return only active brands, models, merchants, and offers.
- All new UI copy must have Chinese and English translations.
- Do not seed production automatically during deployment.
- Do not commit secrets or hard-code runtime secret values.

---

### Task 1: Catalog and Offer Schema

**Files:**
- Create: `migrations/0002_catalog_offers_admin.sql`
- Create: `tests/catalog-schema.test.mjs`
- Modify: `migrations/0001_init_schema.sql` only if migration compatibility requires no direct edit (prefer the new migration).

**Interfaces:**
- Consumes: Existing `users`, `merchants`, `quotes`, and `sessions` tables.
- Produces: `brands`, `models`, `offers`, `audit_logs`, user roles, merchant lifecycle fields, and a two-slot offer constraint.

- [ ] **Step 1: Write the failing schema integration test**

Create a test that applies both migrations to an isolated local D1 persistence directory, inserts one active brand/model/merchant, inserts channel slots 1 and 2, and asserts that inserting slot 3 fails with a SQLite constraint error. Assert that `brands.status`, `models.status`, `offers.status`, `users.role`, `offers.channel_slot`, and `audit_logs.snapshot_json` exist.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/catalog-schema.test.mjs
```

Expected: FAIL because migration `0002_catalog_offers_admin.sql` does not exist.

- [ ] **Step 3: Add the migration**

Add `users.role` with default `merchant`, add lifecycle columns to `merchants`, create catalog tables, create `offers` with `UNIQUE(merchant_id, model_id, channel_slot)` and `CHECK(channel_slot IN (1, 2))`, and create `audit_logs`. Preserve old rows by translating each existing `quotes` row into offer slot 1 with channel name `默认渠道`.

- [ ] **Step 4: Run the schema test and verify GREEN**

Run:

```bash
node --test tests/catalog-schema.test.mjs
```

Expected: PASS, including the rejected third slot.

---

### Task 2: Role-Aware Worker API

**Files:**
- Modify: `src/index.js`
- Modify: `src/auth.js` only for role-aware public user serialization if required.
- Create: `tests/worker-api.test.mjs`

**Interfaces:**
- Consumes: `brands`, `models`, `offers`, `audit_logs`, and the existing session cookie.
- Produces: Public catalog endpoints, merchant offer CRUD, admin catalog/merchant/offer governance, admin role checks, and demo data controls.

- [ ] **Step 1: Write failing API tests**

Cover these cases with a local Worker integration harness:

1. `GET /api/catalog` returns active brands/models only.
2. Merchant registration creates an active merchant and does not create an admin.
3. Merchant can create slots 1 and 2 but receives `409` for slot 3.
4. Merchant cannot mutate another merchant's offer.
5. A non-admin receives `403` for `/api/admin/*`.
6. Admin can create a brand and model, hide and restore an offer, and physically delete an offer with an audit row.

- [ ] **Step 2: Run API tests and verify RED**

Run:

```bash
node --test tests/worker-api.test.mjs
```

Expected: FAIL because the new routes and role checks do not exist.

- [ ] **Step 3: Implement public catalog and offer queries**

Replace hard-coded `MODEL_IDS` validation with database validation and return joined active catalog/offer data from D1. Keep the public response shape compatible with existing market rendering where possible.

- [ ] **Step 4: Implement merchant offer routes**

Add `GET/POST/PUT /api/merchant/offers`, hide/restore routes, and physical delete. Validate active model IDs, slot 1/2, non-negative prices, channel field lengths, and ownership.

- [ ] **Step 5: Implement admin routes**

Add `requireAdminSession`, catalog CRUD, merchant suspension/restoration/deletion, offer governance, audit snapshot writes, and demo-data import/cleanup. Public registration must always assign `merchant` role.

- [ ] **Step 6: Run API tests and verify GREEN**

Run:

```bash
node --test tests/worker-api.test.mjs
```

Expected: all listed authorization and two-slot cases pass.

---

### Task 3: Merchant Two-Channel UI

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/app-state.test.mjs` only if pure state helpers are extracted.

**Interfaces:**
- Consumes: `/api/catalog`, `/api/merchant/offers`, `/api/me`.
- Produces: Bilingual merchant profile, per-model channel slots, direct save/hide/restore/delete actions, and clear two-channel limit feedback.

- [ ] **Step 1: Add UI contract assertions**

Assert that the merchant view contains two channel slots, channel name/contact/url controls, four prices per slot, and localized labels for add, hide, restore, delete, and the two-channel limit.

- [ ] **Step 2: Run UI assertions and verify RED**

Run:

```bash
node --test tests/app-state.test.mjs tests/deployment-assets.test.mjs
```

Expected: fail for the new two-channel contract.

- [ ] **Step 3: Replace the single quote editor**

Render active catalog models and two offer cards per model. Disable the add action when both slots exist, preserve unsaved form state per slot, and call the new merchant offer APIs.

- [ ] **Step 4: Add bilingual copy and lifecycle states**

Add Chinese and English strings for empty catalog, channel slot limits, hidden offers, delete confirmation, save errors, and admin-only messaging. Escape all server-provided values before rendering.

- [ ] **Step 5: Run browser/static tests and verify GREEN**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all existing and new UI contract tests pass.

---

### Task 4: Administrator Console

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Create: `scripts/bootstrap-admin.mjs`
- Create: `tests/admin-ui.test.mjs`

**Interfaces:**
- Consumes: `/api/admin/overview`, catalog CRUD, merchant governance, offer governance, audit logs, and the existing session cookie.
- Produces: `/admin` view with dashboard, catalog, merchants, offers, audit log, and demo-data tools.

- [ ] **Step 1: Add the failing admin UI contract test**

Assert that the document contains admin navigation and panels for overview, brands, models, merchants, offers, audit logs, and demo data.

- [ ] **Step 2: Run the admin UI test and verify RED**

Run:

```bash
node --test tests/admin-ui.test.mjs
```

Expected: FAIL because no admin view exists.

- [ ] **Step 3: Add the admin view and role-aware navigation**

Render the admin panel only for an authenticated admin, while unauthorized users receive a localized forbidden state. Add actions with confirmation dialogs for hide and physical delete.

- [ ] **Step 4: Add catalog, merchant, offer, and audit panels**

Implement forms and tables for the API operations, including reason fields for governance actions and a visible distinction between hidden and deleted records.

- [ ] **Step 5: Add admin bootstrap tooling**

Create `scripts/bootstrap-admin.mjs` that validates an email/password from environment variables, derives a PBKDF2 hash using the existing auth format, and writes or promotes exactly one admin account through a local/remote Wrangler D1 command selected explicitly by the operator.

- [ ] **Step 6: Run admin UI and full tests and verify GREEN**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all tests pass.

---

### Task 5: Initialization and Deployment Verification

**Files:**
- Create: `seeds/production-demo-data.sql`
- Modify: `README.md`
- Modify: `docs/D1_AUTH_DEPLOYMENT.md`
- Modify: `wrangler.toml` only if the migration path requires an explicit environment.

**Interfaces:**
- Consumes: New catalog schema and admin APIs.
- Produces: Explicit local/production initialization workflow without accidental production seeding.

- [ ] **Step 1: Add production demo-data contract tests**

Assert that demo rows are marked `is_demo = 1`, are idempotent, and can be removed by a single cleanup query without affecting non-demo rows.

- [ ] **Step 2: Implement explicit demo seed and cleanup documentation**

Document that deployment does not seed data. Provide separate local and remote commands, a confirmation warning, and the admin cleanup operation.

- [ ] **Step 3: Run migration, seed, API, UI, and asset tests**

Run:

```bash
node --test tests/*.test.mjs
git diff --check
```

- [ ] **Step 4: Verify local D1 and Worker behavior**

Apply migrations locally, load local demo data, start Wrangler, verify public quotes, merchant two-slot enforcement, admin authorization, and no public access to SQL/test files.

- [ ] **Step 5: Deploy schema and Worker separately**

Apply the schema remotely, deploy the Worker with `--keep-vars`, and only import production demo data through an explicit operator action.
