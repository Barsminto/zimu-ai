const encoder = new TextEncoder();
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_HASH_ITERATIONS = 600_000;

export function validateRegistration({ email, password, merchantName }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedMerchantName = String(merchantName || "").trim();
  const normalizedPassword = String(password || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { ok: false, error: "请输入有效的邮箱地址。" };
  if (normalizedPassword.length < PASSWORD_MIN_LENGTH || normalizedPassword.length > PASSWORD_MAX_LENGTH) return { ok: false, error: "密码长度需为 12 至 128 个字符。" };
  if (!/[a-zA-Z]/.test(normalizedPassword) || !/\d/.test(normalizedPassword)) return { ok: false, error: "密码需同时包含字母和数字。" };
  if (normalizedMerchantName.length < 2 || normalizedMerchantName.length > 48) return { ok: false, error: "商户名称需为 2 至 48 个字符。" };

  return { ok: true, email: normalizedEmail, merchantName: normalizedMerchantName };
}

export async function hashPassword(password, iterations = PASSWORD_HASH_ITERATIONS) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePassword(password, salt, iterations);
  return { salt: toBase64Url(salt), hash: toBase64Url(hash) };
}

export async function verifyPassword(password, record, iterations = PASSWORD_HASH_ITERATIONS) {
  const actual = await derivePassword(password, fromBase64Url(record.salt), iterations);
  return timingSafeEqual(actual, fromBase64Url(record.hash));
}

export function randomToken() {
  const token = new Uint8Array(32);
  crypto.getRandomValues(token);
  return toBase64Url(token);
}

export async function sha256(value) {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function derivePassword(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, baseKey, 256));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
