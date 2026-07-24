#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const args = new Set(process.argv.slice(2));
const target = args.has("--local") ? "local" : args.has("--remote") ? "remote" : "";
if (!target || (target === "remote" && !args.has("--confirm-remote"))) {
  console.error("用法：ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/bootstrap-admin.mjs --local");
  console.error("远程：... node scripts/bootstrap-admin.mjs --remote --confirm-remote");
  process.exit(1);
}

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
  throw new Error("ADMIN_EMAIL 或 ADMIN_PASSWORD 无效；密码需 12-128 位且同时包含字母和数字。");
}

const iterations = 600_000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const encode = (value) => value.toString("base64url");
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = Date.now();
const sql = `INSERT INTO users (email, password_hash, password_salt, role, created_at) VALUES (${quote(email)}, ${quote(encode(hash))}, ${quote(encode(salt))}, 'admin', ${now}) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, password_salt = excluded.password_salt, role = 'admin';`;
const command = ["d1", "execute", "model-market-db", `--${target}`, "--command", sql, "--yes"];

console.log(`${target === "remote" ? "远程" : "本地"}管理员初始化：${email}`);
execFileSync("npx", ["wrangler", ...command], { stdio: "inherit", env: process.env });
