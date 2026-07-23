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

`IP_HASH_SECRET` must be a long random value. Do not place secrets in `wrangler.toml` or commit `.dev.vars`. `TURNSTILE_HOSTNAME` and `REGISTRATION_REVIEW_REQUIRED` are non-secret Worker variables in `wrangler.toml`; change the hostname when adding a custom domain.

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
npx wrangler deploy
```

The public API is `GET /api/quotes`. Authentication uses HttpOnly session cookies and the merchant API is protected by `PUT /api/merchant/quotes/:modelId`.

## 4. Registration controls and review

- Turnstile is mandatory for registration, and its action and hostname are checked server-side.
- Registration and login are limited to five attempts per source IP per hour. Only a keyed hash of the source IP is stored in D1.
- Passwords use PBKDF2-SHA-256 with a new random 16-byte salt and 600,000 iterations. The plaintext password is never stored.
- Sessions are random opaque tokens. Only their SHA-256 hashes are stored; cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- With `REGISTRATION_REVIEW_REQUIRED = "true"`, new merchants are `pending`: they can sign in and prepare quotes, but their quotes stay invisible until you activate the merchant.

Approve a merchant after reviewing its public contact and pricing:

```bash
npx wrangler d1 execute model-market-db --remote --command "UPDATE merchants SET status = 'active', updated_at = unixepoch() * 1000 WHERE id = 123;"
```

For an additional edge-level control, create a Cloudflare WAF rate-limiting rule for `POST /api/auth/register` and `POST /api/auth/login`. The Worker safeguards are application-level controls; the WAF rule absorbs volumetric abuse before it reaches D1.
