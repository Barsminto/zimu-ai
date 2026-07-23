import { hashPassword, randomToken, sha256, validateRegistration, verifyPassword } from "./auth.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTH_WINDOW_MS = 60 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 5;
const MODEL_IDS = new Set(["gpt-5-6", "gpt-5-6-mini", "gpt-5-6-nano", "gpt-5-6-reasoning"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = url.pathname.startsWith("/api/")
      ? await handleApi(request, env, url)
      : await env.ASSETS.fetch(request);
    return withSecurityHeaders(response);
  },
};

async function handleApi(request, env, url) {
  if (!env.DB) return apiError("数据库尚未绑定。", 503);
  if (request.method === "GET" && url.pathname === "/api/public-config") {
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" });
  }
  if (request.method === "GET" && url.pathname === "/api/quotes") return getPublicQuotes(env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/register") return register(request, env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout(request, env, url);
  if (request.method === "GET" && url.pathname === "/api/me") return getCurrentUser(request, env);
  if (request.method === "PUT" && url.pathname.startsWith("/api/merchant/quotes/")) return upsertMerchantQuote(request, env, url);
  return apiError("接口不存在。", 404);
}

async function register(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const rateError = await enforceAuthRateLimit(request, env, "register");
  if (rateError) return rateError;
  if (!env.TURNSTILE_SECRET || !env.IP_HASH_SECRET) return apiError("注册服务尚未完成安全配置。", 503);

  const body = await readJson(request);
  if (!body.ok) return body.response;
  const validation = validateRegistration(body.value);
  if (!validation.ok) return apiError(validation.error, 400);
  const contact = String(body.value.contact || "").trim();
  if (contact.length > 80) return apiError("公开联系方式不能超过 80 个字符。", 400);
  if (!await verifyTurnstile(body.value.turnstileToken, request, env)) return apiError("人机验证失败，请重试。", 403);

  const now = Date.now();
  const password = await hashPassword(body.value.password);
  const merchantStatus = env.REGISTRATION_REVIEW_REQUIRED === "true" ? "pending" : "active";
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)").bind(validation.email, password.hash, password.salt, now),
      env.DB.prepare("INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at) SELECT id, ?, ?, ?, ?, ? FROM users WHERE email = ?").bind(validation.merchantName, contact, merchantStatus, now, now, validation.email),
    ]);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return apiError("该邮箱已注册。", 409);
    return apiError("注册失败，请稍后重试。", 500);
  }

  const user = await findUserByEmail(env, validation.email);
  return withSession(json({ user: publicUser(user) }, 201), user, env, url.protocol === "https:");
}

async function login(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const rateError = await enforceAuthRateLimit(request, env, "login");
  if (rateError) return rateError;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const email = String(body.value.email || "").trim().toLowerCase();
  const password = String(body.value.password || "");
  const user = await findUserByEmail(env, email);
  if (!user || user.merchant_status === "suspended" || !await verifyPassword(password, { hash: user.password_hash, salt: user.password_salt })) return apiError("邮箱或密码错误。", 401);
  return withSession(json({ user: publicUser(user) }), user, env, url.protocol === "https:");
}

async function logout(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const token = readCookie(request, "mm_session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return withClearedSession(json({ ok: true }), url.protocol === "https:");
}

async function getCurrentUser(request, env) {
  const session = await requireSession(request, env);
  if (!session) return apiError("未登录。", 401);
  return json({ user: publicUser(session) });
}

async function getPublicQuotes(env, url) {
  const modelId = url.searchParams.get("model");
  const query = modelId && MODEL_IDS.has(modelId)
    ? env.DB.prepare("SELECT q.model_id, q.input_price_milli, q.cache_write_price_milli, q.output_price_milli, q.cache_read_price_milli, q.channel_note, q.updated_at, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact FROM quotes q JOIN merchants m ON m.id = q.merchant_id WHERE m.status = 'active' AND q.model_id = ? ORDER BY q.updated_at DESC").bind(modelId)
    : env.DB.prepare("SELECT q.model_id, q.input_price_milli, q.cache_write_price_milli, q.output_price_milli, q.cache_read_price_milli, q.channel_note, q.updated_at, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact FROM quotes q JOIN merchants m ON m.id = q.merchant_id WHERE m.status = 'active' ORDER BY q.updated_at DESC");
  const { results } = await query.all();
  return json({ quotes: results.map((row) => ({
    modelId: row.model_id,
    merchantId: String(row.merchant_id),
    merchantName: row.merchant_name,
    merchantContact: row.merchant_contact || "",
    inputPrice: row.input_price_milli / 1000,
    cacheWritePrice: row.cache_write_price_milli / 1000,
    outputPrice: row.output_price_milli / 1000,
    cacheReadPrice: row.cache_read_price_milli / 1000,
    note: row.channel_note,
    updatedAt: new Date(row.updated_at).toISOString().slice(0, 10),
  })) });
}

async function upsertMerchantQuote(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const session = await requireSession(request, env);
  if (!session) return apiError("登录状态已失效。", 401);
  const modelId = decodeURIComponent(url.pathname.split("/").pop() || "");
  if (!MODEL_IDS.has(modelId)) return apiError("不支持该模型。", 400);
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const prices = ["inputPrice", "cacheWritePrice", "outputPrice", "cacheReadPrice"].map((key) => toMilli(body.value[key]));
  if (prices.some((price) => price === null)) return apiError("请填写有效的非负价格。", 400);
  const note = String(body.value.note || "").trim();
  if (note.length > 60) return apiError("渠道说明不能超过 60 个字符。", 400);
  const now = Date.now();
  await env.DB.prepare("INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(merchant_id, model_id) DO UPDATE SET input_price_milli = excluded.input_price_milli, cache_write_price_milli = excluded.cache_write_price_milli, output_price_milli = excluded.output_price_milli, cache_read_price_milli = excluded.cache_read_price_milli, channel_note = excluded.channel_note, updated_at = excluded.updated_at")
    .bind(session.merchant_id, modelId, ...prices, note, now).run();
  return json({ ok: true, updatedAt: new Date(now).toISOString().slice(0, 10) });
}

async function requireSession(request, env) {
  const token = readCookie(request, "mm_session");
  if (!token) return null;
  const session = await env.DB.prepare("SELECT u.id, u.email, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact, m.status AS merchant_status FROM sessions s JOIN users u ON u.id = s.user_id JOIN merchants m ON m.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND m.status != 'suspended'").bind(await sha256(token), Date.now()).first();
  return session || null;
}

async function findUserByEmail(env, email) {
  return env.DB.prepare("SELECT u.id, u.email, u.password_hash, u.password_salt, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact, m.status AS merchant_status FROM users u JOIN merchants m ON m.user_id = u.id WHERE u.email = ?").bind(email).first();
}

async function withSession(response, user, env, secureCookie) {
  const token = randomToken();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), user.id, expiresAt, now).run();
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", `mm_session=${token}; HttpOnly;${secureCookie ? " Secure;" : ""} SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`);
  return new Response(response.body, { status: response.status, headers });
}

function withClearedSession(response, secureCookie) {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", `mm_session=; HttpOnly;${secureCookie ? " Secure;" : ""} SameSite=Lax; Path=/; Max-Age=0`);
  return new Response(response.body, { status: response.status, headers });
}

async function enforceAuthRateLimit(request, env, kind) {
  if (!env.IP_HASH_SECRET) return apiError("认证服务尚未完成安全配置。", 503);
  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${env.IP_HASH_SECRET}:${ip}`);
  await env.DB.prepare("DELETE FROM auth_attempts WHERE created_at < ?").bind(now - AUTH_WINDOW_MS).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM auth_attempts WHERE kind = ? AND ip_hash = ? AND created_at >= ?").bind(kind, ipHash, now - AUTH_WINDOW_MS).first();
  if (Number(row.count) >= AUTH_ATTEMPT_LIMIT) return apiError("尝试次数过多，请一小时后再试。", 429);
  await env.DB.prepare("INSERT INTO auth_attempts (kind, ip_hash, created_at) VALUES (?, ?, ?)").bind(kind, ipHash, now).run();
  return null;
}

async function verifyTurnstile(token, request, env) {
  if (!token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  form.set("remoteip", request.headers.get("CF-Connecting-IP") || "");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true
    && result.action === "register"
    && (!env.TURNSTILE_HOSTNAME || result.hostname === env.TURNSTILE_HOSTNAME);
}

function requireSameOrigin(request, url) {
  const origin = request.headers.get("Origin");
  return origin && origin !== url.origin ? apiError("来源校验失败。", 403) : null;
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 8_192) return { ok: false, response: apiError("请求体过大。", 413) };
  try { return { ok: true, value: await request.json() }; } catch { return { ok: false, response: apiError("请求格式无效。", 400) }; }
}

function readCookie(request, name) {
  const entry = (request.headers.get("Cookie") || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : "";
}

function toMilli(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10_000_000) return null;
  return Math.round(number * 1_000);
}

function publicUser(user) {
  return { id: user.id, email: user.email, merchant: { id: String(user.merchant_id), name: user.merchant_name, contact: user.merchant_contact || "", status: user.merchant_status || "active" } };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function apiError(error, status) { return json({ error }, status); }

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", ["default-src 'self'", "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com", "style-src 'self'", "img-src 'self' data:", "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://challenges.cloudflare.com", "frame-src https://challenges.cloudflare.com", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "upgrade-insecure-requests"].join("; "));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-XSS-Protection", "0");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
