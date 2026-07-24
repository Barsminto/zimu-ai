import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("merchant and admin views expose the dual-channel management surfaces", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="offer-editor"/);
  assert.match(html, /data-channel-slot="1"/);
  assert.match(html, /data-channel-slot="2"/);
  assert.match(html, /data-field="channelName"/);
  assert.match(html, /data-field="channelContact"/);
  assert.match(html, /data-field="channelUrl"/);
  assert.match(html, /data-field="inputPrice"/);
  assert.match(html, /data-field="cacheWritePrice"/);
  assert.match(html, /data-field="outputPrice"/);
  assert.match(html, /data-field="cacheReadPrice"/);
  assert.match(html, /id="admin-view"/);
  assert.match(html, /id="admin-overview"/);
  assert.match(html, /id="admin-brands"/);
  assert.match(html, /id="admin-models"/);
  assert.match(html, /id="admin-merchants"/);
  assert.match(html, /id="admin-offers"/);
  assert.match(html, /id="admin-audit"/);
});

test("frontend includes bilingual lifecycle and destructive-action copy", async () => {
  const script = await readFile(new URL("../app.js", import.meta.url), "utf8");
  for (const key of ["channelLimit", "hideOffer", "restoreOffer", "deleteOffer", "deleteConfirm", "adminForbidden"]) {
    assert.match(script, new RegExp(`${key}:`));
  }
  assert.match(script, /\/api\/merchant\/offers/);
  assert.match(script, /\/api\/admin\/overview/);
  assert.match(script, /\/api\/admin\/brands/);
  assert.match(script, /\/api\/admin\/models/);
  assert.match(script, /\/api\/admin\/merchants/);
  assert.match(script, /\/api\/admin\/offers/);
  assert.match(script, /\/api\/admin\/audit/);
});
