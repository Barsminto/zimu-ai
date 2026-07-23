# Model Relay Market Design

## Goal

Replace the browser encryption product with a static, bilingual market directory for model relay providers. Visitors compare public prices and merchant updates; one simulated merchant can manage its own prices and posts.

## Scope

- Public market with model, provider, input/output price, context and update time.
- Price unit: CNY per one million tokens.
- Fixed model catalog: GPT-5.6, GPT-5.6-mini, GPT-5.6-nano and GPT-5.6-reasoning.
- One simulated merchant session, entered from a static sign-in screen.
- One editable quote per merchant/model and a Twitter-like post composer.
- Built-in fake market data plus browser-local merchant changes persisted with `localStorage`.
- Chinese/English translations and accessible light/dark themes.
- Retain the existing delayed Cloudflare Web Analytics beacon and Worker/static deployment setup.

## Non-goals

- No real authentication, server API, public data writes, payment, moderation, message delivery, or user-to-user chat.
- Local merchant changes are clearly labelled as a browser-only demo.

## Architecture

`app-state.js` is a DOM-free ES module for quote normalization/upsert and post creation. It is covered by Node's built-in test runner. `app.js` owns seed data, localStorage hydration, rendering, i18n, theme switching and page events. `index.html` contains semantic page shells and dialog surfaces; `styles.css` owns responsive visual design.

## Data flow

1. The public page renders seed providers, seed quotes and seed posts plus locally stored merchant records.
2. The merchant entry sets a local demo-session flag.
3. Saving a quote upserts by `(merchantId, modelId)`; saving a post prepends it to the local feed.
4. `app.js` persists the local state and rerenders the public market and merchant center.

## Trust and accessibility

Every saved browser-local record is marked as demo data. Text, controls, disabled states, card boundaries and placeholders use contrast-safe light and dark tokens. The Analytics script remains delayed until `load` and does not receive form content.
