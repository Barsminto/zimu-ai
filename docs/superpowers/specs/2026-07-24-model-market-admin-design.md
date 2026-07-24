# Model Market Admin and Dual-Channel Design

## Goal

Turn the current public quote directory into a bilingual, role-aware marketplace with dynamic brand/model catalogs, merchant-managed offers, and an administrator console.

## Current gaps

- Production D1 has the schema but no public demo rows.
- Model IDs are hard-coded in the Worker and browser.
- `quotes` enforces one quote per merchant/model, so it cannot represent two channels.
- There is no user role, admin session, admin API, catalog API, or admin UI.
- The existing merchant UI only supports a single quote per model.

## Roles and permissions

### Visitor

Visitors can browse active brands, active models, active merchants, and active offers. They can search, sort, and open public contact details but cannot mutate data.

### Merchant

Merchant registration is immediate after validation and Turnstile verification. Merchants can edit their profile and directly create, update, hide, restore, and delete their own offers. Each merchant/model pair has at most two offers, represented by channel slots 1 and 2.

### Admin

Admin accounts are created through an explicit bootstrap command or database operation. Admins can manage brands, models, merchants, offers, demo data, and audit logs. Admin endpoints require a valid session whose user role is `admin`; hiding is reversible and deleting is physical deletion after confirmation.

## Deletion semantics

- Hide/suspend: soft state change, immediately excluded from public results, recoverable.
- Delete: physical deletion, irreversible from the application, protected by confirmation and recorded with a pre-delete snapshot in `audit_logs`.
- Deleting a merchant cascades to its offers and sessions after the audit snapshot is written.
- Deleting a brand/model cascades to dependent offers only after explicit confirmation.

## Data model

Keep the existing `users`, `merchants`, `sessions`, and `auth_attempts` tables, then extend them with roles and lifecycle state. Add:

- `brands`: administrator-managed provider brands.
- `models`: administrator-managed models belonging to a brand.
- `offers`: one merchant/model/channel-slot row containing channel details and four prices. A unique `(merchant_id, model_id, channel_slot)` constraint enforces the two-channel rule.
- `audit_logs`: actor, action, target, reason, and JSON snapshot for destructive or governance actions.

Prices remain integer milli-units. Public queries only return active rows across all joined entities. The browser no longer owns the authoritative model list.

## User flows

1. Visitor opens the market, loads catalog and active offers, filters, sorts, and opens a contact modal.
2. Merchant registers, passes validation and Turnstile, receives an active session, selects an active model, and creates up to two channel offers.
3. Merchant updates or hides its own offers immediately. Public results reflect the active state.
4. Admin signs in through `/admin`, manages catalog, governs merchants/offers, and imports or removes explicitly marked demo data.

## Pages

- Public market: catalog filters, search, sorting, grouped offers, contact modal, bilingual copy.
- Merchant center: profile, overview, per-model two-slot offer editor, login/register/logout.
- Admin console: dashboard metrics, brand management, model management, merchant list/detail, offer governance, audit log, demo data tools.

## API surface

Public:

- `GET /api/catalog`
- `GET /api/brands`
- `GET /api/models`
- `GET /api/quotes`

Merchant:

- Existing auth endpoints and `GET /api/me`.
- `GET/POST/PUT /api/merchant/offers`
- `POST /api/merchant/offers/:id/hide`
- `POST /api/merchant/offers/:id/restore`
- `DELETE /api/merchant/offers/:id`

Admin:

- `GET /api/admin/overview`
- Brand and model CRUD plus hide/restore endpoints.
- Merchant list/detail, suspend/restore, and delete endpoints.
- Offer hide/restore/delete endpoints.
- Audit log listing and explicit demo-data import/cleanup endpoints.

## Security

- Role checks happen in Worker code, never only in the browser.
- Admin registration is disabled; bootstrap is explicit and one-time.
- Existing HttpOnly, SameSite session cookies remain the session mechanism.
- Same-origin checks and rate limits apply to all mutations.
- Destructive admin actions require a reason and are audited.
- `TURNSTILE_SECRET` and `IP_HASH_SECRET` remain Worker runtime secrets.

## Data initialization

- `seeds/local-test-data.sql` remains local-only.
- Production demo data uses a separate explicit admin action or `--remote` command and is marked `is_demo = true` so it can be removed safely.
- Deployment never imports demo rows implicitly.

## Implementation order

1. Add migration and data-layer tests for roles, catalog, offers, and audit rows.
2. Replace hard-coded model validation and public quote queries with D1 catalog queries.
3. Add role-aware auth and admin APIs.
4. Convert merchant UI to the two-channel offer editor.
5. Add admin UI and bilingual strings.
6. Add local/remote initialization tools, run tests, and verify deployment.

## Success criteria

- A merchant cannot create a third offer for the same model.
- Admins can add a brand/model and it appears in merchant selectors without code changes.
- Admin hiding removes data from public results without deleting it.
- Admin deletion physically removes the target and its dependent records after an audit snapshot.
- Public, merchant, and admin routes enforce their roles server-side.
- Chinese and English cover all new pages and actions.
