# D1 Authentication Deployment

The repository includes the D1 migration and Worker API. The placeholder D1 UUID in `wrangler.toml` must be replaced before a remote deploy.

## 1. Create the database

Create an API token with Workers, D1, and Account Settings write permissions, then run:

```bash
export CLOUDFLARE_API_TOKEN="..."
npx wrangler d1 create model-market-db
```

Copy the returned UUID into `wrangler.toml` as `database_id`.

## 2. Configure Turnstile and secrets

Create a managed Turnstile widget for `encfile.antiumbo123.workers.dev`, with the widget action left unrestricted. The Worker requires a token issued for the `register` action and verifies the returned hostname. `TURNSTILE_SITE_KEY` is public and belongs in `[vars]`; store the secret values outside Git:

```bash
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put IP_HASH_SECRET
```

`IP_HASH_SECRET` must be a long random value. Do not place secrets in `wrangler.toml` or commit `.dev.vars`. `TURNSTILE_HOSTNAME` is a non-secret Worker variable in `wrangler.toml`; change the hostname when adding a custom domain.

For local development, copy `.dev.vars.example` to `.dev.vars` and use Turnstile test credentials.

## Local testing

```bash
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply model-market-db --local
npx wrangler dev --local --port 4186
```

Open `http://127.0.0.1:4186/`. The bundled Turnstile test key always passes verification. On local HTTP only, the session cookie omits `Secure` so that a browser can retain the login; deployed HTTPS cookies always include `Secure`.

## 3. Apply migrations and deploy

```bash
npx wrangler d1 migrations apply model-market-db --remote
npx wrangler deploy --keep-vars
```

The public APIs are `GET /api/catalog` and `GET /api/quotes`. Merchant channel management uses `GET/POST/PUT /api/merchant/offers`, plus `/hide`, `/restore`, and `DELETE`. Admin APIs are under `/api/admin/*` and require a session whose `users.role` is `admin`.

Create or promote an administrator explicitly; public registration always creates a merchant role:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='ChangeMe2026!' node scripts/bootstrap-admin.mjs --remote --confirm-remote
```

## 4. Registration controls and review

- Turnstile is mandatory for registration, and its action and hostname are checked server-side.
- Registration and login are limited to five attempts per source IP per hour. Only a keyed hash of the source IP is stored in D1.
- Passwords use PBKDF2-SHA-256 with a new random 16-byte salt and 600,000 iterations. The plaintext password is never stored.
- Sessions are random opaque tokens. Only their SHA-256 hashes are stored; cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- New registrations are active after Turnstile and input validation. An administrator can later suspend a merchant or hide individual channels without deleting them.

Suspend or restore a merchant from the admin console, or use D1 directly when performing an emergency operation:

```bash
npx wrangler d1 execute model-market-db --remote --command "UPDATE merchants SET status = 'suspended', hidden_at = unixepoch() * 1000, updated_at = unixepoch() * 1000 WHERE id = 123;"
```

Production demo data is never imported during deployment. If needed, run it as an explicit operator action:

```bash
npx wrangler d1 execute model-market-db --remote --file seeds/production-demo-data.sql --yes
```

All demo rows use `is_demo = 1`. Remove only demo merchants, offers, and their demo users with the cleanup statements documented at the end of that SQL file.

For an additional edge-level control, create a Cloudflare WAF rate-limiting rule for `POST /api/auth/register` and `POST /api/auth/login`. The Worker safeguards are application-level controls; the WAF rule absorbs volumetric abuse before it reaches D1.
