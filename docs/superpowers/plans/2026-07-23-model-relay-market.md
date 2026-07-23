# Model Relay Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, bilingual model relay quote directory with a browser-local merchant demonstration center.

**Architecture:** Keep state mutation in a DOM-free ES module and render the static application from a small browser module. Fake market data is bundled; the active merchant's changes persist only in `localStorage`.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node `node:test`, Cloudflare Workers static assets.

## Global Constraints

- Use only static assets; do not add a backend or package runtime dependency.
- Retain Cloudflare Web Analytics, delayed until page `load`.
- Keep Chinese and English UI plus a persistent light/dark preference.
- Quotes use CNY per 1M tokens and only the fixed GPT-5.6 catalog.
- A merchant can own at most one quote per model.

---

### Task 1: State Rules

**Files:**
- Create: `app-state.js`
- Create: `tests/app-state.test.mjs`

**Interfaces:**
- Produces `upsertQuote(quotes, quote)` and `createPost(posts, post)`.

- [ ] Write tests asserting a quote with the same merchant/model replaces its prior quote and a post is prepended with a generated id.
- [ ] Run `node --test tests/app-state.test.mjs` and observe a missing-module failure.
- [ ] Implement pure immutable functions in `app-state.js`.
- [ ] Re-run the tests and require two passing tests.

### Task 2: Static Application

**Files:**
- Replace: `index.html`
- Create: `app.js`
- Replace: `tailwind.input.css`
- Regenerate: `styles.css`

**Interfaces:**
- Consumes `upsertQuote` and `createPost` from `app-state.js`.
- Produces public market filtering, modal contact detail, merchant session, quote edit and post publishing.

- [ ] Replace encryption markup with accessible market, merchant, quote and post surfaces.
- [ ] Render seed fake data and hydrated local records in both languages.
- [ ] Add contrast-safe responsive light/dark design and generate minified stylesheet.
- [ ] Retain delayed Analytics initialization and no third-party UI runtime.

### Task 3: Documentation and Verification

**Files:**
- Replace: `README.md`

- [ ] Describe static-demo limitations, data persistence, local preview and Cloudflare deployment.
- [ ] Run state tests, JavaScript syntax checks and `git diff --check`.
- [ ] Start a non-8787 local server and confirm page, script, stylesheet and verification file return HTTP 200.
