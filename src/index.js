import { hashPassword, randomToken, sha256, validateRegistration, verifyPassword } from "./auth.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTH_WINDOW_MS = 60 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 5;

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
  if (request.method === "GET" && url.pathname === "/api/public-config") return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" });
  if (request.method === "GET" && ["/api/catalog", "/api/brands", "/api/models"].includes(url.pathname)) return getCatalog(env);
  if (request.method === "GET" && url.pathname === "/api/quotes") return getPublicQuotes(env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/register") return register(request, env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, env, url);
  if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout(request, env, url);
  if (request.method === "GET" && url.pathname === "/api/me") return getCurrentUser(request, env);
  if (url.pathname.startsWith("/api/merchant/offers")) return handleMerchantOffers(request, env, url);
  if (request.method === "PUT" && url.pathname.startsWith("/api/merchant/quotes/")) return upsertLegacyMerchantQuote(request, env, url);
  if (url.pathname.startsWith("/api/admin/")) return handleAdmin(request, env, url);
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
  if (!validation.ok) return apiError(validation.error, validation.status || 400);
  const contact = String(body.value.contact || "").trim();
  if (contact.length > 80) return apiError("公开联系方式不能超过 80 个字符。", 400);
  if (!await verifyTurnstile(body.value.turnstileToken, request, env)) return apiError("人机验证失败，请重试。", 403);

  const now = Date.now();
  const password = await hashPassword(body.value.password);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, 'merchant', ?)").bind(validation.email, password.hash, password.salt, now),
      env.DB.prepare("INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at) SELECT id, ?, ?, 'active', ?, ? FROM users WHERE email = ?").bind(validation.merchantName, contact, now, now, validation.email),
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

async function getCatalog(env) {
  const { results } = await env.DB.prepare("SELECT b.id AS brand_id, b.slug AS brand_slug, b.name AS brand_name, b.logo_url, b.sort_order AS brand_sort_order, m.id AS model_id, m.slug AS model_slug, m.name AS model_name, m.description AS model_description, m.sort_order AS model_sort_order FROM brands b LEFT JOIN models m ON m.brand_id = b.id AND m.status = 'active' WHERE b.status = 'active' ORDER BY b.sort_order, b.name, m.sort_order, m.name").all();
  const brands = [];
  const byId = new Map();
  for (const row of results) {
    if (!byId.has(row.brand_id)) {
      const brand = { id: row.brand_id, slug: row.brand_slug, name: row.brand_name, logoUrl: row.logo_url || "", models: [] };
      byId.set(row.brand_id, brand);
      brands.push(brand);
    }
    if (row.model_id) byId.get(row.brand_id).models.push({ id: row.model_id, slug: row.model_slug, name: row.model_name, description: row.model_description || "" });
  }
  return json({ brands, models: brands.flatMap((brand) => brand.models.map((model) => ({ ...model, brandId: brand.id, brandSlug: brand.slug, brandName: brand.name }))) });
}

async function getPublicQuotes(env, url) {
  const modelId = url.searchParams.get("model");
  const params = [];
  let sql = "SELECT o.id AS offer_id, o.model_id, o.channel_slot, o.channel_name, o.channel_contact, o.channel_url, o.channel_region, o.channel_currency, o.input_price_milli, o.cache_write_price_milli, o.output_price_milli, o.cache_read_price_milli, o.channel_note, o.updated_at, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact, mo.name AS model_name, mo.slug AS model_slug, b.slug AS brand_slug, b.name AS brand_name FROM offers o JOIN merchants m ON m.id = o.merchant_id JOIN models mo ON mo.id = o.model_id JOIN brands b ON b.id = mo.brand_id WHERE o.status = 'active' AND m.status = 'active' AND m.hidden_at IS NULL AND mo.status = 'active' AND b.status = 'active'";
  if (modelId) {
    sql += " AND o.model_id = ?";
    params.push(modelId);
  }
  sql += " ORDER BY o.updated_at DESC, m.name, o.channel_slot";
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return json({ quotes: results.map(publicOffer) });
}

async function handleMerchantOffers(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const session = await requireMerchantSession(request, env);
  if (!session) return apiError("登录状态已失效。", 401);
  const suffix = url.pathname.slice("/api/merchant/offers".length).replace(/^\//, "");
  if (request.method === "GET" && !suffix) return listMerchantOffers(env, session.merchant_id);
  if (request.method === "POST" && !suffix) return createMerchantOffer(request, env, session);
  if (!suffix) return apiError("接口不存在。", 404);
  const offerId = Number(suffix.split("/")[0]);
  if (!Number.isInteger(offerId) || offerId <= 0) return apiError("渠道 ID 无效。", 400);
  const action = suffix.split("/")[1] || "";
  if (request.method === "PUT" && !action) return updateMerchantOffer(request, env, session, offerId);
  if (request.method === "POST" && ["hide", "restore"].includes(action)) return setOfferStatus(request, env, session, offerId, action === "restore" ? "active" : "hidden");
  if (request.method === "DELETE" && !action) return deleteMerchantOffer(env, session, offerId);
  return apiError("接口不存在。", 404);
}

async function listMerchantOffers(env, merchantId) {
  const { results } = await env.DB.prepare("SELECT o.*, mo.name AS model_name, mo.brand_id, b.name AS brand_name FROM offers o JOIN models mo ON mo.id = o.model_id JOIN brands b ON b.id = mo.brand_id WHERE o.merchant_id = ? ORDER BY b.sort_order, mo.sort_order, o.channel_slot").bind(merchantId).all();
  return json({ offers: results.map(publicOffer) });
}

async function createMerchantOffer(request, env, session) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = normalizeOffer(body.value);
  const validation = await validateOffer(env, input);
  if (!validation.ok) return apiError(validation.error, validation.status || 400);
  const now = Date.now();
  try {
    const result = await env.DB.prepare("INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_url, channel_region, channel_currency, channel_note, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)").bind(session.merchant_id, input.modelId, input.channelSlot, input.channelName, input.channelContact, input.channelUrl, input.channelRegion, input.channelCurrency, input.channelNote, input.inputPrice, input.cacheWritePrice, input.outputPrice, input.cacheReadPrice, now, now).run();
    return json({ ok: true, offerId: result.meta?.last_row_id || null }, 201);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return apiError("该模型最多只能配置两个渠道。", 409);
    return apiError("渠道保存失败。", 500);
  }
}

async function updateMerchantOffer(request, env, session, offerId) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = normalizeOffer(body.value);
  const validation = await validateOffer(env, input);
  if (!validation.ok) return apiError(validation.error, validation.status || 400);
  const result = await env.DB.prepare("UPDATE offers SET model_id = ?, channel_slot = ?, channel_name = ?, channel_contact = ?, channel_url = ?, channel_region = ?, channel_currency = ?, channel_note = ?, input_price_milli = ?, cache_write_price_milli = ?, output_price_milli = ?, cache_read_price_milli = ?, updated_at = ? WHERE id = ? AND merchant_id = ?").bind(input.modelId, input.channelSlot, input.channelName, input.channelContact, input.channelUrl, input.channelRegion, input.channelCurrency, input.channelNote, input.inputPrice, input.cacheWritePrice, input.outputPrice, input.cacheReadPrice, Date.now(), offerId, session.merchant_id).run();
  if (!result.meta?.changes) return apiError("渠道不存在。", 404);
  return json({ ok: true });
}

async function setOfferStatus(request, env, session, offerId, status) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const reason = String(body.value.reason || "").trim().slice(0, 240);
  const result = await env.DB.prepare("UPDATE offers SET status = ?, hidden_at = ?, hidden_by = ?, hidden_reason = ?, updated_at = ? WHERE id = ? AND merchant_id = ?").bind(status, status === "hidden" ? Date.now() : null, status === "hidden" ? session.id : null, status === "hidden" ? reason : "", Date.now(), offerId, session.merchant_id).run();
  if (!result.meta?.changes) return apiError("渠道不存在。", 404);
  return json({ ok: true, status });
}

async function deleteMerchantOffer(env, session, offerId) {
  const offer = await env.DB.prepare("SELECT * FROM offers WHERE id = ? AND merchant_id = ?").bind(offerId, session.merchant_id).first();
  if (!offer) return apiError("渠道不存在。", 404);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, reason, snapshot_json, created_at) VALUES (?, 'merchant_delete_offer', 'offer', ?, '', ?, ?)").bind(session.id, String(offerId), JSON.stringify(offer), Date.now()),
    env.DB.prepare("DELETE FROM offers WHERE id = ? AND merchant_id = ?").bind(offerId, session.merchant_id),
  ]);
  return json({ ok: true });
}

async function upsertLegacyMerchantQuote(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const session = await requireMerchantSession(request, env);
  if (!session) return apiError("登录状态已失效。", 401);
  const modelId = decodeURIComponent(url.pathname.split("/").pop() || "");
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const input = normalizeOffer({ ...body.value, modelId, channelSlot: 1, channelName: body.value.channelName || "默认渠道", channelContact: body.value.channelContact || session.merchant_contact || "" });
  const validation = await validateOffer(env, input);
  if (!validation.ok) return apiError(validation.error, 400);
  const now = Date.now();
  await env.DB.prepare("INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_note, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?) ON CONFLICT(merchant_id, model_id, channel_slot) DO UPDATE SET channel_name = excluded.channel_name, channel_contact = excluded.channel_contact, channel_note = excluded.channel_note, input_price_milli = excluded.input_price_milli, cache_write_price_milli = excluded.cache_write_price_milli, output_price_milli = excluded.output_price_milli, cache_read_price_milli = excluded.cache_read_price_milli, updated_at = excluded.updated_at").bind(session.merchant_id, input.modelId, input.channelName, input.channelContact, input.channelNote, input.inputPrice, input.cacheWritePrice, input.outputPrice, input.cacheReadPrice, now, now).run();
  return json({ ok: true, updatedAt: new Date(now).toISOString().slice(0, 10) });
}

async function handleAdmin(request, env, url) {
  const originError = requireSameOrigin(request, url);
  if (originError) return originError;
  const session = await requireAdminSession(request, env);
  if (!session) return apiError("管理员权限不足。", 403);
  const path = url.pathname.slice("/api/admin/".length).replace(/\/$/, "");
  if (request.method === "GET" && path === "overview") return getAdminOverview(env);
  if (request.method === "GET" && path === "brands") return listAdminBrands(env);
  if (request.method === "POST" && path === "brands") return createBrand(request, env, session);
  if (path.startsWith("brands/")) return handleAdminBrand(request, env, session, path.slice(7));
  if (request.method === "GET" && path === "models") return listAdminModels(env);
  if (request.method === "POST" && path === "models") return createModel(request, env, session);
  if (path.startsWith("models/")) return handleAdminModel(request, env, session, path.slice(7));
  if (request.method === "GET" && path === "merchants") return listAdminMerchants(env);
  if (path.startsWith("merchants/")) return handleAdminMerchant(request, env, session, path.slice(10));
  if (request.method === "GET" && path === "offers") return listAdminOffers(env);
  if (path.startsWith("offers/")) return handleAdminOffer(request, env, session, path.slice(7));
  if (request.method === "GET" && path === "audit-logs") return listAuditLogs(env);
  return apiError("接口不存在。", 404);
}

async function getAdminOverview(env) {
  const row = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM merchants WHERE status = 'active' AND hidden_at IS NULL) AS active_merchants, (SELECT COUNT(*) FROM brands WHERE status = 'active') AS active_brands, (SELECT COUNT(*) FROM models WHERE status = 'active') AS active_models, (SELECT COUNT(*) FROM offers WHERE status = 'active') AS active_offers, (SELECT COUNT(*) FROM offers WHERE status = 'hidden') AS hidden_offers").first();
  return json({ overview: row });
}

async function listAdminBrands(env) {
  const { results } = await env.DB.prepare("SELECT * FROM brands ORDER BY sort_order, name").all();
  return json({ brands: results });
}

async function createBrand(request, env, session) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const slug = String(body.value.slug || "").trim().toLowerCase();
  const name = String(body.value.name || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug) || !name || name.length > 64) return apiError("品牌信息无效。", 400);
  try {
    const result = await env.DB.prepare("INSERT INTO brands (slug, name, logo_url, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(slug, name, String(body.value.logoUrl || "").trim().slice(0, 300), Number(body.value.sortOrder || 0), Date.now(), Date.now()).run();
    return json({ ok: true, brandId: result.meta?.last_row_id || null }, 201);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return apiError("品牌标识已存在。", 409);
    return apiError("品牌创建失败。", 500);
  }
}

async function handleAdminBrand(request, env, session, idText) {
  const id = Number(idText.split("/")[0]);
  const action = idText.split("/")[1] || "";
  if (!Number.isInteger(id) || id <= 0) return apiError("品牌 ID 无效。", 400);
  if (request.method === "POST" && ["hide", "restore"].includes(action)) return setCatalogStatus(env, session, "brands", id, action === "restore" ? "active" : "hidden");
  if (request.method === "PUT" && !action) return updateBrand(request, env, id);
  if (request.method === "DELETE" && !action) return deleteBrand(env, session, id);
  return apiError("接口不存在。", 404);
}

async function updateBrand(request, env, id) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const name = String(body.value.name || "").trim();
  if (!name || name.length > 64) return apiError("品牌名称无效。", 400);
  const result = await env.DB.prepare("UPDATE brands SET name = ?, logo_url = ?, sort_order = ?, updated_at = ? WHERE id = ?").bind(name, String(body.value.logoUrl || "").trim().slice(0, 300), Number(body.value.sortOrder || 0), Date.now(), id).run();
  return result.meta?.changes ? json({ ok: true }) : apiError("品牌不存在。", 404);
}

async function listAdminModels(env) {
  const { results } = await env.DB.prepare("SELECT mo.*, b.name AS brand_name, b.slug AS brand_slug FROM models mo JOIN brands b ON b.id = mo.brand_id ORDER BY b.sort_order, mo.sort_order, mo.name").all();
  return json({ models: results });
}

async function createModel(request, env) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const id = String(body.value.id || body.value.slug || "").trim().toLowerCase();
  const slug = String(body.value.slug || id).trim().toLowerCase();
  const name = String(body.value.name || "").trim();
  const brandId = Number(body.value.brandId);
  if (!/^[a-z0-9][a-z0-9-]{1,95}$/.test(id) || !/^[a-z0-9][a-z0-9-]{1,95}$/.test(slug) || !name || !Number.isInteger(brandId)) return apiError("模型信息无效。", 400);
  const brand = await env.DB.prepare("SELECT id FROM brands WHERE id = ? AND status = 'active'").bind(brandId).first();
  if (!brand) return apiError("品牌不存在或已下架。", 400);
  try {
    const result = await env.DB.prepare("INSERT INTO models (id, brand_id, slug, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, brandId, slug, name, String(body.value.description || "").trim().slice(0, 300), Number(body.value.sortOrder || 0), Date.now(), Date.now()).run();
    return json({ ok: true, modelId: result.meta?.last_row_id || id }, 201);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return apiError("模型标识已存在。", 409);
    return apiError("模型创建失败。", 500);
  }
}

async function handleAdminModel(request, env, session, idText) {
  const id = decodeURIComponent(idText.split("/")[0]);
  const action = idText.split("/")[1] || "";
  if (!id) return apiError("模型 ID 无效。", 400);
  if (request.method === "POST" && ["hide", "restore"].includes(action)) return setCatalogStatus(env, session, "models", id, action === "restore" ? "active" : "hidden");
  if (request.method === "PUT" && !action) return updateModel(request, env, id);
  if (request.method === "DELETE" && !action) return deleteModel(env, session, id);
  return apiError("接口不存在。", 404);
}

async function updateModel(request, env, id) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const name = String(body.value.name || "").trim();
  const brandId = Number(body.value.brandId);
  if (!name || name.length > 96 || !Number.isInteger(brandId)) return apiError("模型信息无效。", 400);
  const result = await env.DB.prepare("UPDATE models SET brand_id = ?, name = ?, description = ?, sort_order = ?, updated_at = ? WHERE id = ?").bind(brandId, name, String(body.value.description || "").trim().slice(0, 300), Number(body.value.sortOrder || 0), Date.now(), id).run();
  return result.meta?.changes ? json({ ok: true }) : apiError("模型不存在。", 404);
}

async function listAdminMerchants(env) {
  const { results } = await env.DB.prepare("SELECT m.*, u.email, (SELECT COUNT(*) FROM offers o WHERE o.merchant_id = m.id) AS offer_count FROM merchants m JOIN users u ON u.id = m.user_id ORDER BY m.updated_at DESC").all();
  return json({ merchants: results });
}

async function handleAdminMerchant(request, env, session, idText) {
  const id = Number(idText.split("/")[0]);
  const action = idText.split("/")[1] || "";
  if (!Number.isInteger(id) || id <= 0) return apiError("商户 ID 无效。", 400);
  if (request.method === "POST" && ["suspend", "restore"].includes(action)) return setMerchantStatus(env, session, id, action === "restore" ? "active" : "suspended");
  if (request.method === "DELETE" && !action) return deleteMerchant(env, session, id);
  if (request.method === "GET" && !action) return getAdminMerchant(env, id);
  return apiError("接口不存在。", 404);
}

async function getAdminMerchant(env, id) {
  const merchant = await env.DB.prepare("SELECT m.*, u.email FROM merchants m JOIN users u ON u.id = m.user_id WHERE m.id = ?").bind(id).first();
  if (!merchant) return apiError("商户不存在。", 404);
  const { results: offers } = await env.DB.prepare("SELECT * FROM offers WHERE merchant_id = ? ORDER BY model_id, channel_slot").bind(id).all();
  return json({ merchant, offers });
}

async function listAdminOffers(env) {
  const { results } = await env.DB.prepare("SELECT o.*, m.name AS merchant_name, mo.name AS model_name, b.name AS brand_name FROM offers o JOIN merchants m ON m.id = o.merchant_id JOIN models mo ON mo.id = o.model_id JOIN brands b ON b.id = mo.brand_id ORDER BY o.updated_at DESC").all();
  return json({ offers: results });
}

async function handleAdminOffer(request, env, session, idText) {
  const id = Number(idText.split("/")[0]);
  const action = idText.split("/")[1] || "";
  if (!Number.isInteger(id) || id <= 0) return apiError("渠道 ID 无效。", 400);
  if (request.method === "POST" && ["hide", "restore"].includes(action)) return setOfferStatusAdmin(request, env, session, id, action === "restore" ? "active" : "hidden");
  if (request.method === "DELETE" && !action) return deleteOfferAdmin(env, session, id);
  return apiError("接口不存在。", 404);
}

async function listAuditLogs(env) {
  const { results } = await env.DB.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200").all();
  return json({ logs: results });
}

async function setCatalogStatus(env, session, table, id, status) {
  const result = await env.DB.prepare(`UPDATE ${table} SET status = ?, updated_at = ? WHERE ${table === "brands" ? "id" : "id"} = ?`).bind(status, Date.now(), id).run();
  if (!result.meta?.changes) return apiError("目录项不存在。", 404);
  await writeAudit(env, session.id, `${status === "hidden" ? "hide" : "restore"}_${table.slice(0, -1)}`, table.slice(0, -1), String(id), "", { status });
  return json({ ok: true, status });
}

async function deleteBrand(env, session, id) {
  const brand = await env.DB.prepare("SELECT * FROM brands WHERE id = ?").bind(id).first();
  if (!brand) return apiError("品牌不存在。", 404);
  const dependent = await env.DB.prepare("SELECT COUNT(*) AS count FROM models WHERE brand_id = ?").bind(id).first();
  if (Number(dependent.count)) return apiError("该品牌仍有模型，请先删除模型。", 409);
  await writeAudit(env, session.id, "delete_brand", "brand", String(id), "", brand);
  await env.DB.prepare("DELETE FROM brands WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function deleteModel(env, session, id) {
  const model = await env.DB.prepare("SELECT * FROM models WHERE id = ?").bind(id).first();
  if (!model) return apiError("模型不存在。", 404);
  const offers = await env.DB.prepare("SELECT * FROM offers WHERE model_id = ?").bind(id).all();
  await writeAudit(env, session.id, "delete_model", "model", String(id), "", { model, offers: offers.results });
  await env.DB.prepare("DELETE FROM models WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function setMerchantStatus(env, session, id, status) {
  const result = await env.DB.prepare("UPDATE merchants SET status = ?, hidden_at = ?, hidden_by = ?, hidden_reason = ?, updated_at = ? WHERE id = ?").bind(status, status === "suspended" ? Date.now() : null, status === "suspended" ? session.id : null, status === "suspended" ? "管理员操作" : "", Date.now(), id).run();
  if (!result.meta?.changes) return apiError("商户不存在。", 404);
  await writeAudit(env, session.id, status === "suspended" ? "suspend_merchant" : "restore_merchant", "merchant", String(id), "", { status });
  return json({ ok: true, status });
}

async function deleteMerchant(env, session, id) {
  const merchant = await env.DB.prepare("SELECT m.*, u.email FROM merchants m JOIN users u ON u.id = m.user_id WHERE m.id = ?").bind(id).first();
  if (!merchant) return apiError("商户不存在。", 404);
  const { results: offers } = await env.DB.prepare("SELECT * FROM offers WHERE merchant_id = ?").bind(id).all();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, reason, snapshot_json, created_at) VALUES (?, 'delete_merchant', 'merchant', ?, '', ?, ?)").bind(session.id, String(id), JSON.stringify({ merchant, offers }), Date.now()),
    env.DB.prepare("DELETE FROM merchants WHERE id = ?").bind(id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(merchant.user_id),
  ]);
  return json({ ok: true });
}

async function setOfferStatusAdmin(request, env, session, id, status) {
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const reason = String(body.value.reason || "").trim().slice(0, 240);
  const result = await env.DB.prepare("UPDATE offers SET status = ?, hidden_at = ?, hidden_by = ?, hidden_reason = ?, updated_at = ? WHERE id = ?").bind(status, status === "hidden" ? Date.now() : null, status === "hidden" ? session.id : null, status === "hidden" ? reason : "", Date.now(), id).run();
  if (!result.meta?.changes) return apiError("渠道不存在。", 404);
  await writeAudit(env, session.id, status === "hidden" ? "hide_offer" : "restore_offer", "offer", String(id), reason, { status });
  return json({ ok: true, status });
}

async function deleteOfferAdmin(env, session, id) {
  const offer = await env.DB.prepare("SELECT * FROM offers WHERE id = ?").bind(id).first();
  if (!offer) return apiError("渠道不存在。", 404);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, reason, snapshot_json, created_at) VALUES (?, 'delete_offer', 'offer', ?, '', ?, ?)").bind(session.id, String(id), JSON.stringify(offer), Date.now()),
    env.DB.prepare("DELETE FROM offers WHERE id = ?").bind(id),
  ]);
  return json({ ok: true });
}

async function writeAudit(env, actorUserId, action, targetType, targetId, reason, snapshot) {
  await env.DB.prepare("INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, reason, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(actorUserId, action, targetType, targetId, reason, JSON.stringify(snapshot || {}), Date.now()).run();
}

async function requireMerchantSession(request, env) {
  const session = await requireSession(request, env);
  return session?.merchant_id && session.merchant_status === "active" ? session : null;
}

async function requireAdminSession(request, env) {
  const session = await requireSession(request, env);
  return session?.role === "admin" ? session : null;
}

async function requireSession(request, env) {
  const token = readCookie(request, "mm_session");
  if (!token) return null;
  const session = await env.DB.prepare("SELECT u.id, u.email, u.role, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact, m.status AS merchant_status FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN merchants m ON m.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND (m.status IS NULL OR m.status != 'suspended')").bind(await sha256(token), Date.now()).first();
  return session || null;
}

async function findUserByEmail(env, email) {
  return env.DB.prepare("SELECT u.id, u.email, u.role, u.password_hash, u.password_salt, m.id AS merchant_id, m.name AS merchant_name, m.contact AS merchant_contact, m.status AS merchant_status FROM users u LEFT JOIN merchants m ON m.user_id = u.id WHERE u.email = ?").bind(email).first();
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
  return result.success === true && result.action === "register" && (!env.TURNSTILE_HOSTNAME || result.hostname === env.TURNSTILE_HOSTNAME);
}

function normalizeOffer(value) {
  return {
    modelId: String(value.modelId || "").trim(),
    channelSlot: Number(value.channelSlot),
    channelName: String(value.channelName || "").trim(),
    channelContact: String(value.channelContact || "").trim(),
    channelUrl: String(value.channelUrl || "").trim(),
    channelRegion: String(value.channelRegion || "").trim(),
    channelCurrency: String(value.channelCurrency || "CNY").trim().toUpperCase(),
    channelNote: String(value.channelNote ?? value.note ?? "").trim(),
    inputPrice: toMilli(value.inputPrice),
    cacheWritePrice: toMilli(value.cacheWritePrice),
    outputPrice: toMilli(value.outputPrice),
    cacheReadPrice: toMilli(value.cacheReadPrice),
  };
}

async function validateOffer(env, input) {
  if (!input.modelId || !Number.isInteger(input.channelSlot) || input.channelSlot < 1) return { ok: false, error: "模型或渠道编号无效。" };
  if (input.channelSlot > 2) return { ok: false, error: "该模型最多只能配置两个渠道。", status: 409 };
  if (![input.inputPrice, input.cacheWritePrice, input.outputPrice, input.cacheReadPrice].every((value) => value !== null)) return { ok: false, error: "请填写有效的非负价格。" };
  if (!input.channelName || input.channelName.length > 64 || input.channelContact.length > 120 || input.channelUrl.length > 300 || input.channelRegion.length > 48 || input.channelNote.length > 120) return { ok: false, error: "渠道信息长度无效。" };
  const model = await env.DB.prepare("SELECT id FROM models WHERE id = ? AND status = 'active'").bind(input.modelId).first();
  return model ? { ok: true } : { ok: false, error: "模型不存在或已下架。" };
}

function publicOffer(row) {
  return {
    offerId: String(row.offer_id || row.id || ""),
    modelId: row.model_id,
    modelName: row.model_name || "",
    brandName: row.brand_name || "",
    brandSlug: row.brand_slug || "",
    merchantId: String(row.merchant_id),
    merchantName: row.merchant_name || "",
    merchantContact: row.merchant_contact || "",
    channelSlot: row.channel_slot,
    channelName: row.channel_name || "",
    channelContact: row.channel_contact || row.merchant_contact || "",
    channelUrl: row.channel_url || "",
    channelRegion: row.channel_region || "",
    currency: row.channel_currency || "CNY",
    inputPrice: row.input_price_milli / 1000,
    cacheWritePrice: row.cache_write_price_milli / 1000,
    outputPrice: row.output_price_milli / 1000,
    cacheReadPrice: row.cache_read_price_milli / 1000,
    note: row.channel_note || "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : "",
    status: row.status || "active",
  };
}

function requireSameOrigin(request, url) {
  const origin = request.headers.get("Origin");
  return origin && origin !== url.origin ? apiError("来源校验失败。", 403) : null;
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 16_384) return { ok: false, response: apiError("请求体过大。", 413) };
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
  return {
    id: user.id,
    email: user.email,
    role: user.role || "merchant",
    merchant: user.merchant_id ? { id: String(user.merchant_id), name: user.merchant_name, contact: user.merchant_contact || "", status: user.merchant_status || "active" } : null,
  };
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
