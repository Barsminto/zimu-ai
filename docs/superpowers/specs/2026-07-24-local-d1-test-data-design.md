# Local D1 Test Data Design

## Goal

Provide deterministic, repeatable test data for the local Cloudflare D1 database without changing the production schema or writing to the remote database.

## Scope

- Seed the existing `users`, `merchants`, and `quotes` tables.
- Keep the seed safe to run repeatedly.
- Include active merchants for public market pages.
- Include one pending merchant to verify review-gated visibility.
- Cover every model accepted by the Worker API.
- Document local setup, seed, reset, and verification commands.

## Non-goals

- No remote D1 writes.
- No schema changes.
- No production merchant records.
- No changes to registration, login, or public quote behavior.

## Chosen approach

Use a standalone SQL file at `seeds/local-test-data.sql`. Wrangler's D1 file executor rejects SQL transaction-control statements, so the seed uses the existing unique constraints to make each statement idempotent and safe to re-run. It will create local-only `.test` email accounts with a documented demo password, active and pending merchant records, and deterministic quotes.

The seed will use the same PBKDF2-SHA-256 password format as `src/auth.js`. Password hash and salt values will be generated once for the local demo password and stored only in the local seed file; they are not production credentials.

## Data set

- Three active merchants with varied public contacts and pricing.
- One pending merchant with quotes that must not appear in `GET /api/quotes`.
- All four supported model IDs:
  - `gpt-5-6`
  - `gpt-5-6-mini`
  - `gpt-5-6-nano`
  - `gpt-5-6-reasoning`
- A shared local-only password: `LocalDemo2026!`

## Idempotency

- Users are keyed by their unique test email.
- Merchants are keyed by their unique `user_id`.
- Quotes are keyed by the existing `(merchant_id, model_id)` constraint.
- Re-running the seed updates deterministic test values instead of creating duplicate rows.
- A failed seed can be safely resumed by running the same file again; the seed does not rely on `BEGIN` or `COMMIT`.
- The seed does not delete unrelated local records.

## Verification

1. Apply the existing migration to local D1.
2. Execute the seed SQL against local D1.
3. Query row counts and merchant statuses.
4. Run the existing Node test suite.
5. Start Wrangler locally and verify the public quote API only returns active merchants.

## Files

- Add `seeds/local-test-data.sql`.
- Add a small seed verification test or script only if the existing test setup cannot verify the D1 command output directly.
- Update `README.md` with local D1 commands and credentials.

## Risks and mitigations

- A local seed password could be reused accidentally: use `.test` emails, label it clearly as local-only, and never run the seed with remote flags.
- SQL hash fixtures could drift from the auth implementation: verify the seeded account with the existing login flow and keep the iteration count aligned with `src/auth.js`.
- The local schema might be stale: always apply migrations before seeding.
