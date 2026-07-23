import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, validateRegistration, verifyPassword } from "../src/auth.js";

test("registration validation rejects malformed input before hashing", () => {
  assert.equal(validateRegistration({ email: "invalid", password: "short", merchantName: "" }).ok, false);
  assert.equal(validateRegistration({ email: "owner@example.com", merchantName: "Northstar Relay" }).ok, false);
  assert.deepEqual(
    validateRegistration({ email: "owner@example.com", password: "LongEnoughPassword1!", merchantName: "Northstar Relay" }),
    { ok: true, email: "owner@example.com", merchantName: "Northstar Relay" },
  );
});

test("PBKDF2 password records verify only the original password", async () => {
  const record = await hashPassword("LongEnoughPassword1!", 1_000);

  assert.equal(await verifyPassword("LongEnoughPassword1!", record, 1_000), true);
  assert.equal(await verifyPassword("different-password", record, 1_000), false);
  assert.notEqual(record.salt, "");
  assert.notEqual(record.hash, "");
});
