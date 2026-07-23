import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { filterQuotes, paginateQuotes, sortQuotes, upsertQuote } from "../app-state.js";

test("upsertQuote replaces a merchant's existing quote for the same model", () => {
  const current = [
    { id: "quote-a", merchantId: "demo-merchant", modelId: "gpt-5-6", inputPrice: 8.8, outputPrice: 35.2 },
    { id: "quote-b", merchantId: "other-merchant", modelId: "gpt-5-6", inputPrice: 9.5, outputPrice: 38 },
  ];

  const result = upsertQuote(current, {
    merchantId: "demo-merchant",
    modelId: "gpt-5-6",
    inputPrice: 8.2,
    outputPrice: 33.6,
  });

  assert.equal(result.length, 2);
  assert.deepEqual(result.find((quote) => quote.merchantId === "demo-merchant"), {
    id: "quote-a",
    merchantId: "demo-merchant",
    modelId: "gpt-5-6",
    inputPrice: 8.2,
    outputPrice: 33.6,
  });
});

test("sortQuotes defaults to most recently updated first and supports price ordering", () => {
  const quotes = [
    { id: "older", inputPrice: 8, outputPrice: 20, updatedAt: "2026-07-20" },
    { id: "newer", inputPrice: 1, outputPrice: 3, updatedAt: "2026-07-23" },
  ];

  assert.deepEqual(sortQuotes(quotes, "low").map((quote) => quote.id), ["newer", "older"]);
  assert.deepEqual(sortQuotes(quotes, "high").map((quote) => quote.id), ["older", "newer"]);
  assert.deepEqual(sortQuotes(quotes).map((quote) => quote.id), ["newer", "older"]);
});

test("filterQuotes links the selected brand and model", () => {
  const quotes = [
    { merchantName: "A", modelName: "GPT", modelId: "gpt", brand: "OpenAI" },
    { merchantName: "B", modelName: "Claude", modelId: "claude", brand: "Anthropic" },
  ];

  assert.deepEqual(filterQuotes(quotes, { brand: "OpenAI" }), [quotes[0]]);
  assert.deepEqual(filterQuotes(quotes, { brand: "OpenAI", model: "claude" }), []);
});

test("paginateQuotes returns the selected page and total pages", () => {
  const quotes = Array.from({ length: 53 }, (_, index) => ({ id: index }));

  assert.deepEqual(paginateQuotes(quotes, 2, 20), { items: quotes.slice(20, 40), page: 2, totalPages: 3 });
});

test("toolbar separates the search field from the sort control", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="search-field"/);
  assert.match(html, /class="sort-field"/);
  assert.match(html, /class="market-controls"/);
});

test("market removes provider updates and limits the channel description", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.doesNotMatch(html, /data-view="feed"/);
  assert.doesNotMatch(html, /id="feed-view"/);
  assert.doesNotMatch(html, /id="post-form"/);
  assert.match(html, /data-i18n="channelDescription"/);
  assert.match(html, /id="quote-note" maxlength="60"/);
});

test("quote UI uses a sticky model heading and cache prices without a sort label", async () => {
  const [html, script, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../tailwind.input.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(html, /data-i18n="sortLabel"/);
  assert.match(html, /id="input-cache-price"/);
  assert.match(html, /id="output-cache-price"/);
  assert.match(script, /quote-model-sticky/);
  assert.match(script, /syncQuoteSticky/);
  assert.match(css, /\.quote-model-sticky \{ position:fixed/);
  assert.match(script, /quote-sticky-table/);
  assert.match(script, /quote-table-columns/);
  assert.doesNotMatch(script, /<th>\$\{t\("modelLabel"\)\}<\/th>/);
});
