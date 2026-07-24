import { filterQuotes, paginateQuotes, sortQuotes } from "./app-state.js?v=20260723-6";

const FALLBACK_CATALOG = {
  brands: [{ id: 1, slug: "openai", name: "OpenAI", models: [
    { id: "gpt-5-6", slug: "gpt-5-6", name: "GPT-5.6", description: "" },
    { id: "gpt-5-6-mini", slug: "gpt-5-6-mini", name: "GPT-5.6 mini", description: "" },
    { id: "gpt-5-6-nano", slug: "gpt-5-6-nano", name: "GPT-5.6 nano", description: "" },
    { id: "gpt-5-6-reasoning", slug: "gpt-5-6-reasoning", name: "GPT-5.6 reasoning", description: "" },
  ] }],
};
FALLBACK_CATALOG.models = FALLBACK_CATALOG.brands.flatMap((brand) => brand.models.map((modelItem) => ({ ...modelItem, brandId: brand.id, brandSlug: brand.slug, brandName: brand.name })));

const I18N = {
  "zh-CN": {
    brandSub: "模型中转报价市场", navMarket: "报价市场", navMerchant: "商户中心", navAdmin: "管理后台", merchantEntry: "商户入口", themeToggle: "切换主题",
    eyebrow: "公开目录 · 实时比较", heroTitle: "找到适合你的<br><em>模型报价。</em>", heroCopy: "汇集模型中转服务商的公开价格，帮助你更快做出选择。", heroNote: "数据由商户自行维护<br>联系前请先确认条款",
    brandFilterTitle: "快速选择品牌", modelFilterTitle: "快速选择模型", searchPlaceholder: "搜索模型、商户或渠道", sortDefault: "最近更新", sortLow: "价格最低", sortHigh: "价格最高", quoteEyebrow: "价格目录", quoteTitle: "所有上架报价",
    workspaceEyebrow: "商户工作台", workspaceTitle: "管理你的公开渠道。", workspaceCopy: "每个模型最多配置两个渠道，保存后立即生效。", channelLimit: "每个模型最多 2 个渠道", channelLimitHelp: "渠道 1 和渠道 2 独立维护。下架可恢复，删除不可撤销。",
    loginTitle: "进入商户中心", loginCopy: "注册后即可维护公开报价。", loginTab: "登录", registerTab: "注册", emailLabel: "邮箱", passwordLabel: "密码", merchantNameLabel: "商户名称", contactLabel: "公开联系方式", contactPlaceholder: "例如：邮箱、Telegram 或微信", loginButton: "登录", registerButton: "创建商户账户", localOnly: "认证信息仅用于登录，不会公开展示。", turnstileRequired: "请先完成人机验证。", authUnavailable: "服务暂不可用，请稍后再试。",
    merchantDesc: "维护公开展示的模型渠道。", logout: "退出", quoteManageEyebrow: "我的渠道", quoteManageTitle: "模型渠道管理", modelLabel: "模型", channelOne: "渠道 1", channelTwo: "渠道 2", channel: "渠道", channelName: "渠道名称", channelContact: "渠道联系方式", channelUrl: "渠道网址", channelRegion: "服务区域", channelDescription: "渠道说明", channelPlaceholder: "例如：新用户首月 9 折", inputPrice: "输入价 / 缓存（1M）", outputPrice: "输出价 / 缓存（1M）", cacheWritePrice: "缓存生成价（1M）", cacheReadPrice: "缓存读取价（1M）", saveOffer: "保存渠道", saved: "渠道已保存并立即生效。", required: "请填写完整且有效的渠道信息。", hideOffer: "下架", restoreOffer: "恢复", deleteOffer: "删除", deleteConfirm: "确认永久删除？该操作无法撤销。", hidden: "已下架", active: "已上架", emptySlot: "未创建", lifecycleReason: "请输入操作原因（可留空）", previewEyebrow: "公开预览", previewTitle: "当前模型的公开渠道", noOffers: "当前模型尚未配置渠道。",
    merchant: "商户", contact: "联系", updated: "更新于", empty: "没有找到匹配的报价。", perPage: "每页", rows: "条", previousPage: "上一页", nextPage: "下一页", footerDisclaimer: "价格仅供参考，交易请自行核验", openSource: "开源代码 ↗", docs: "使用说明", contactEyebrow: "联系商户", contactCopy: "以下联系方式由商户公开提供。",
    adminEyebrow: "系统管理", adminTitle: "目录、商户与渠道治理。", adminCopy: "下架为软删除，可恢复；删除为物理删除并保留审计快照。", refresh: "刷新数据", adminForbidden: "仅管理员可以访问此页面。", adminOverview: "概览", adminBrands: "品牌", adminModels: "模型", adminMerchants: "商户", adminOffers: "渠道", adminAudit: "审计日志", createBrand: "添加品牌", createModel: "添加模型", create: "创建", name: "名称", sortOrder: "排序", brand: "品牌", description: "说明", status: "状态", actions: "操作", offerCount: "渠道数", time: "时间", action: "动作", target: "对象", reason: "原因", edit: "编辑", suspend: "停用", restore: "恢复", remove: "删除", adminSaved: "操作成功。", adminLoadError: "后台数据加载失败。",
    metricMerchants: "活跃商户", metricBrands: "活跃品牌", metricModels: "活跃模型", metricOffers: "上架渠道", metricHiddenOffers: "下架渠道",
  },
  en: {
    brandSub: "Model relay price market", navMarket: "Market", navMerchant: "Merchant center", navAdmin: "Admin", merchantEntry: "For providers", themeToggle: "Toggle theme",
    eyebrow: "PUBLIC DIRECTORY · LIVE COMPARISON", heroTitle: "Find the right<br><em>model pricing.</em>", heroCopy: "Compare public prices from model relay providers in one place.", heroNote: "Maintained by each provider<br>Confirm terms before contacting",
    brandFilterTitle: "Quick brand filters", modelFilterTitle: "Quick model filters", searchPlaceholder: "Search models, providers, or channels", sortDefault: "Recently updated", sortLow: "Lowest price", sortHigh: "Highest price", quoteEyebrow: "PRICE DIRECTORY", quoteTitle: "All listed offers",
    workspaceEyebrow: "PROVIDER WORKSPACE", workspaceTitle: "Manage your public channels.", workspaceCopy: "Each model supports up to two channels. Saved changes go live immediately.", channelLimit: "Maximum 2 channels per model", channelLimitHelp: "Channel 1 and Channel 2 are managed independently. Hidden offers can be restored; deletion is permanent.",
    loginTitle: "Enter merchant center", loginCopy: "Register to maintain your public offers.", loginTab: "Sign in", registerTab: "Register", emailLabel: "Email", passwordLabel: "Password", merchantNameLabel: "Provider name", contactLabel: "Public contact", contactPlaceholder: "Email, Telegram, or another public channel", loginButton: "Sign in", registerButton: "Create provider account", localOnly: "Authentication details are never displayed publicly.", turnstileRequired: "Please complete the verification first.", authUnavailable: "The service is temporarily unavailable.",
    merchantDesc: "Maintain your public model channels.", logout: "Log out", quoteManageEyebrow: "MY CHANNELS", quoteManageTitle: "Model channel management", modelLabel: "Model", channelOne: "Channel 1", channelTwo: "Channel 2", channel: "Channel", channelName: "Channel name", channelContact: "Channel contact", channelUrl: "Channel URL", channelRegion: "Service region", channelDescription: "Channel notes", channelPlaceholder: "e.g. 10% off for new users", inputPrice: "Input / cache (1M)", outputPrice: "Output / cache (1M)", cacheWritePrice: "Cache write (1M)", cacheReadPrice: "Cache read (1M)", saveOffer: "Save channel", saved: "Channel saved and published.", required: "Enter complete and valid channel information.", hideOffer: "Hide", restoreOffer: "Restore", deleteOffer: "Delete", deleteConfirm: "Permanently delete this record? This cannot be undone.", hidden: "Hidden", active: "Active", emptySlot: "Not created", lifecycleReason: "Enter a reason (optional)", previewEyebrow: "PUBLIC PREVIEW", previewTitle: "Public channels for this model", noOffers: "No channel has been configured for this model.",
    merchant: "Provider", contact: "Contact", updated: "Updated", empty: "No matching offers found.", perPage: "Rows", rows: "per page", previousPage: "Previous page", nextPage: "Next page", footerDisclaimer: "Prices are indicative. Verify terms before transacting.", openSource: "Open source ↗", docs: "Docs", contactEyebrow: "CONTACT PROVIDER", contactCopy: "This contact is supplied publicly by the provider.",
    adminEyebrow: "SYSTEM ADMIN", adminTitle: "Govern catalog, merchants, and channels.", adminCopy: "Hiding is reversible. Deletion is physical and retains an audit snapshot.", refresh: "Refresh", adminForbidden: "Only administrators can access this page.", adminOverview: "Overview", adminBrands: "Brands", adminModels: "Models", adminMerchants: "Merchants", adminOffers: "Channels", adminAudit: "Audit log", createBrand: "Add brand", createModel: "Add model", create: "Create", name: "Name", sortOrder: "Order", brand: "Brand", description: "Description", status: "Status", actions: "Actions", offerCount: "Channels", time: "Time", action: "Action", target: "Target", reason: "Reason", edit: "Edit", suspend: "Suspend", restore: "Restore", remove: "Delete", adminSaved: "Operation completed.", adminLoadError: "Failed to load admin data.",
    metricMerchants: "Active merchants", metricBrands: "Active brands", metricModels: "Active models", metricOffers: "Active channels", metricHiddenOffers: "Hidden channels",
  },
};

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} },
};

let lang = storage.get("model-market-lang") || "zh-CN";
let theme = storage.get("model-market-theme") || "light";
let catalog = FALLBACK_CATALOG;
let publicQuotes = [];
let merchantOffers = [];
let currentUser = null;
let turnstileWidgetId = null;
let activeBrand = catalog.brands[0]?.name || "";
let activeModel = catalog.models[0]?.id || "";
let sortDirection = "default";
let currentPage = 1;
let pageSize = 20;
let adminData = { overview: {}, brands: [], models: [], merchants: [], offers: [], logs: [] };

function t(key) { return I18N[lang]?.[key] || I18N.en[key] || key; }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
function selectedModel() { return catalog.models.find((modelItem) => modelItem.id === activeModel) || catalog.models[0] || { id: "", name: "—", brandName: "—" }; }
function modelById(modelId) { return catalog.models.find((modelItem) => modelItem.id === modelId) || { id: modelId, name: modelId, brandName: "" }; }
function formatPrice(value) { return Number(value || 0).toFixed(3).replace(/\.000$/, ".00"); }
function offerIdentifier(offer) { return offer?.offerId || offer?.id || ""; }
function isAdmin() { return currentUser?.role === "admin"; }
function hasMerchant() { return Boolean(currentUser?.merchant); }

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || t("authUnavailable"));
    error.status = response.status;
    throw error;
  }
  return data;
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.getElementById("lang-toggle").textContent = lang === "zh-CN" ? "EN" : "中";
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.innerHTML = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
  renderQuickFilters();
  renderQuotes();
  renderOfferEditor();
  renderAdmin();
}

async function loadCatalog() {
  try {
    const data = await api("/api/catalog");
    if (Array.isArray(data.brands) && data.brands.length && Array.isArray(data.models) && data.models.length) catalog = data;
  } catch (_) {}
  if (!catalog.models.some((modelItem) => modelItem.id === activeModel)) activeModel = catalog.models[0]?.id || "";
  activeBrand = selectedModel().brandName || catalog.brands[0]?.name || "";
  populateModelSelect();
  renderQuickFilters();
}

async function loadPublicQuotes() {
  try {
    const data = await api("/api/quotes");
    publicQuotes = Array.isArray(data.quotes) ? data.quotes : [];
  } catch (_) {
    publicQuotes = [];
  }
  renderQuotes();
}

async function refreshSession() {
  try {
    currentUser = (await api("/api/me")).user;
  } catch (_) {
    currentUser = null;
  }
  syncRoleUi();
  if (hasMerchant()) await loadMerchantOffers();
  if (isAdmin()) await loadAdminData();
}

function syncRoleUi() {
  document.getElementById("login-card").classList.toggle("hidden", Boolean(currentUser));
  document.getElementById("dashboard").classList.toggle("hidden", !hasMerchant());
  document.getElementById("admin-nav").classList.toggle("hidden", !isAdmin());
  document.getElementById("admin-console").classList.toggle("hidden", !isAdmin());
  document.getElementById("admin-forbidden").classList.toggle("hidden", isAdmin());
  if (hasMerchant()) document.getElementById("merchant-name").textContent = currentUser.merchant.name;
}

async function initializeTurnstile() {
  try {
    const config = await api("/api/public-config");
    if (!config.turnstileSiteKey) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.turnstile) return;
      turnstileWidgetId = window.turnstile.render("#turnstile-widget", { sitekey: config.turnstileSiteKey, action: "register", theme: theme === "dark" ? "dark" : "light" });
    };
    document.head.appendChild(script);
  } catch (_) {}
}

function setAuthMode(mode) {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === mode));
  document.getElementById("login-form").classList.toggle("hidden", mode !== "login");
  document.getElementById("register-form").classList.toggle("hidden", mode !== "register");
  document.getElementById("auth-status").textContent = "";
}

async function submitAuth(endpoint, payload) {
  const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
  currentUser = data.user;
  syncRoleUi();
  if (hasMerchant()) await loadMerchantOffers();
  if (isAdmin()) await loadAdminData();
}

function populateModelSelect() {
  const select = document.getElementById("model-select");
  select.innerHTML = catalog.models.map((modelItem) => `<option value="${escapeHTML(modelItem.id)}">${escapeHTML(modelItem.brandName)} · ${escapeHTML(modelItem.name)}</option>`).join("");
  select.value = activeModel;
}

function renderQuickFilters() {
  const brandContainer = document.getElementById("brand-filters");
  const modelContainer = document.getElementById("model-filters");
  if (!brandContainer || !modelContainer) return;
  brandContainer.innerHTML = catalog.brands.map((brand) => `<button class="quick-option ${activeBrand === brand.name ? "is-active" : ""}" data-brand="${escapeHTML(brand.name)}">${escapeHTML(brand.name)}</button>`).join("");
  const visibleModels = catalog.models.filter((modelItem) => modelItem.brandName === activeBrand);
  modelContainer.innerHTML = visibleModels.map((modelItem) => `<button class="quick-option ${activeModel === modelItem.id ? "is-active" : ""}" data-model="${escapeHTML(modelItem.id)}">${escapeHTML(modelItem.name)}</button>`).join("");
  brandContainer.querySelectorAll("[data-brand]").forEach((button) => button.addEventListener("click", () => {
    activeBrand = button.dataset.brand;
    activeModel = catalog.models.find((modelItem) => modelItem.brandName === activeBrand)?.id || "";
    currentPage = 1;
    renderQuickFilters();
    renderQuotes();
  }));
  modelContainer.querySelectorAll("[data-model]").forEach((button) => button.addEventListener("click", () => {
    activeModel = button.dataset.model;
    activeBrand = selectedModel().brandName;
    currentPage = 1;
    renderQuickFilters();
    renderQuotes();
  }));
}

function renderQuotes() {
  const quoteList = document.getElementById("quote-list");
  if (!quoteList) return;
  const query = document.getElementById("search-input")?.value.trim().toLowerCase() || "";
  let quotes = publicQuotes.map((quote) => ({
    ...quote,
    merchantName: quote.merchantName || t("merchant"),
    modelName: quote.modelName || modelById(quote.modelId).name,
    brand: quote.brandName || modelById(quote.modelId).brandName,
  }));
  quotes = filterQuotes(quotes, { query, brand: activeBrand, model: activeModel });
  quotes = sortQuotes(quotes, sortDirection);
  const pagination = paginateQuotes(quotes, currentPage, pageSize);
  currentPage = pagination.page;
  document.getElementById("quote-count").textContent = lang === "zh-CN" ? `${quotes.length} 条报价` : `${quotes.length} offers`;
  const currentModel = selectedModel();
  const tableColumns = `<colgroup class="quote-table-columns"><col class="quote-col-merchant"><col class="quote-col-channel"><col class="quote-col-input"><col class="quote-col-output"><col class="quote-col-updated"><col class="quote-col-action"></colgroup>`;
  const tableHeader = `<tr><th>${t("merchant")}</th><th>${t("channelDescription")}</th><th>${t("inputPrice")}</th><th>${t("outputPrice")}</th><th>${t("updated")}</th><th></th></tr>`;
  quoteList.innerHTML = quotes.length ? `<div class="quote-model-sticky"><div class="quote-sticky-title"><strong>${escapeHTML(currentModel.name)}</strong><span>${escapeHTML(currentModel.brandName)}</span></div><table class="quote-table quote-sticky-table">${tableColumns}<thead>${tableHeader}</thead></table></div><div class="quote-table-wrap"><table class="quote-table">${tableColumns}<thead>${tableHeader}</thead><tbody>${pagination.items.map((quote) => `<tr><td><strong>${escapeHTML(quote.merchantName)}</strong><small>${escapeHTML(quote.channelRegion || "")}</small></td><td class="channel-cell" title="${escapeHTML(quote.note)}"><strong>${escapeHTML(quote.channelName || `#${quote.channelSlot}`)}</strong><small>${escapeHTML(quote.note || "—")}</small></td><td class="price-cell"><span>¥${formatPrice(quote.inputPrice)}</span><small>¥${formatPrice(quote.cacheWritePrice)}</small></td><td class="price-cell"><span>¥${formatPrice(quote.outputPrice)}</span><small>¥${formatPrice(quote.cacheReadPrice)}</small></td><td>${escapeHTML(quote.updatedAt || "—")}</td><td><button class="contact-button" data-contact-offer="${escapeHTML(offerIdentifier(quote))}">${t("contact")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">${t("empty")}</div>`;
  quoteList.querySelectorAll("[data-contact-offer]").forEach((button) => button.addEventListener("click", () => openContact(button.dataset.contactOffer)));
  document.getElementById("page-size-select").value = String(pageSize);
  document.getElementById("page-summary").textContent = `${pagination.page} / ${pagination.totalPages}`;
  document.getElementById("page-prev").disabled = pagination.page === 1;
  document.getElementById("page-next").disabled = pagination.page >= pagination.totalPages;
  syncQuoteSticky();
}

function syncQuoteSticky() {
  const sticky = document.querySelector(".quote-model-sticky");
  const wrapper = document.querySelector(".quote-table-wrap");
  if (!sticky || !wrapper) return;
  const rectangle = wrapper.getBoundingClientRect();
  const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
  const visible = rectangle.top < headerHeight && rectangle.bottom > headerHeight + sticky.offsetHeight;
  sticky.classList.toggle("is-visible", visible);
  sticky.style.setProperty("--sticky-left", `${rectangle.left}px`);
  sticky.style.setProperty("--sticky-width", `${rectangle.width}px`);
  sticky.style.setProperty("--sticky-top", `${headerHeight}px`);
}

function openContact(offerId) {
  const offer = publicQuotes.find((quote) => String(offerIdentifier(quote)) === String(offerId));
  if (!offer) return;
  document.getElementById("contact-name").textContent = `${offer.merchantName} · ${offer.channelName || `#${offer.channelSlot}`}`;
  const safeUrl = /^https:\/\//i.test(offer.channelUrl || "") ? offer.channelUrl : "";
  document.getElementById("contact-details").innerHTML = `<div><span>✉</span><strong>${escapeHTML(offer.channelContact || offer.merchantContact || "—")}</strong></div>${safeUrl ? `<p><a href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(safeUrl)}</a></p>` : ""}<p>${escapeHTML(offer.note || "")}</p>`;
  document.getElementById("contact-dialog").showModal();
}

function setView(view) {
  if (view === "admin" && !isAdmin()) view = "merchant";
  document.querySelectorAll(".view").forEach((node) => node.classList.toggle("is-visible", node.id === `${view}-view`));
  document.querySelectorAll("[data-view]").forEach((node) => node.classList.toggle("is-active", node.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadMerchantOffers() {
  if (!hasMerchant()) return;
  try {
    merchantOffers = (await api("/api/merchant/offers")).offers || [];
  } catch (error) {
    if (error.status === 401) {
      currentUser = null;
      merchantOffers = [];
      syncRoleUi();
    }
  }
  renderOfferEditor();
}

function renderOfferEditor() {
  const select = document.getElementById("model-select");
  if (!select) return;
  if (select.options.length !== catalog.models.length) populateModelSelect();
  select.value = activeModel;
  document.querySelectorAll(".offer-card[data-channel-slot]").forEach((form) => {
    const channelSlot = Number(form.dataset.channelSlot);
    const offer = merchantOffers.find((item) => item.modelId === activeModel && Number(item.channelSlot) === channelSlot);
    form.dataset.offerId = offerIdentifier(offer);
    for (const field of ["channelName", "channelContact", "channelUrl", "channelRegion", "channelNote", "inputPrice", "cacheWritePrice", "outputPrice", "cacheReadPrice"]) {
      const input = form.querySelector(`[data-field="${field}"]`);
      if (input) input.value = offer?.[field] ?? "";
    }
    const status = offer?.status || "empty";
    form.classList.toggle("is-hidden-offer", status === "hidden");
    form.querySelector("[data-offer-status]").textContent = status === "active" ? t("active") : status === "hidden" ? t("hidden") : t("emptySlot");
    form.querySelector('[data-offer-action="hide"]').classList.toggle("hidden", !offer || status === "hidden");
    form.querySelector('[data-offer-action="restore"]').classList.toggle("hidden", status !== "hidden");
    form.querySelector('[data-offer-action="delete"]').classList.toggle("hidden", !offer);
    form.querySelector("[data-offer-message]").textContent = "";
  });
  renderPreview();
}

function offerPayload(form) {
  const payload = { modelId: activeModel, channelSlot: Number(form.dataset.channelSlot), channelCurrency: "CNY" };
  for (const field of ["channelName", "channelContact", "channelUrl", "channelRegion", "channelNote"]) payload[field] = form.querySelector(`[data-field="${field}"]`).value.trim();
  for (const field of ["inputPrice", "cacheWritePrice", "outputPrice", "cacheReadPrice"]) payload[field] = Number(form.querySelector(`[data-field="${field}"]`).value);
  return payload;
}

async function saveOffer(form) {
  const message = form.querySelector("[data-offer-message]");
  const payload = offerPayload(form);
  if (!payload.channelName || ![payload.inputPrice, payload.cacheWritePrice, payload.outputPrice, payload.cacheReadPrice].every((value) => Number.isFinite(value) && value >= 0)) {
    message.textContent = t("required");
    return;
  }
  const offerId = form.dataset.offerId;
  try {
    await api(offerId ? `/api/merchant/offers/${encodeURIComponent(offerId)}` : "/api/merchant/offers", { method: offerId ? "PUT" : "POST", body: JSON.stringify(payload) });
    await Promise.all([loadMerchantOffers(), loadPublicQuotes()]);
    form.querySelector("[data-offer-message]").textContent = t("saved");
  } catch (error) {
    message.textContent = error.message;
  }
}

async function mutateOffer(form, action) {
  const offerId = form.dataset.offerId;
  if (!offerId) return;
  if (action === "delete" && !window.confirm(t("deleteConfirm"))) return;
  const reason = action === "hide" ? window.prompt(t("lifecycleReason"), "") ?? "" : "";
  try {
    if (action === "delete") await api(`/api/merchant/offers/${encodeURIComponent(offerId)}`, { method: "DELETE" });
    else await api(`/api/merchant/offers/${encodeURIComponent(offerId)}/${action}`, { method: "POST", body: JSON.stringify({ reason }) });
    await Promise.all([loadMerchantOffers(), loadPublicQuotes()]);
  } catch (error) {
    form.querySelector("[data-offer-message]").textContent = error.message;
  }
}

function renderPreview() {
  const preview = document.getElementById("my-preview");
  if (!preview) return;
  const offers = merchantOffers.filter((offer) => offer.modelId === activeModel && offer.status === "active");
  preview.innerHTML = offers.length ? `<div class="mini-quotes">${offers.map((offer) => `<div><span>${escapeHTML(offer.channelName)}</span><strong>¥${formatPrice(offer.inputPrice)} / ¥${formatPrice(offer.outputPrice)}</strong><small>${escapeHTML(offer.note || "")}</small></div>`).join("")}</div>` : `<div class="empty-state">${t("noOffers")}</div>`;
}

async function loadAdminData() {
  if (!isAdmin()) return;
  try {
    const [overview, brands, models, merchants, offers, audit] = await Promise.all([
      api("/api/admin/overview"), api("/api/admin/brands"), api("/api/admin/models"), api("/api/admin/merchants"), api("/api/admin/offers"), api("/api/admin/audit-logs"),
    ]);
    adminData = { overview: overview.overview || {}, brands: brands.brands || [], models: models.models || [], merchants: merchants.merchants || [], offers: offers.offers || [], logs: audit.logs || [] };
    renderAdmin();
  } catch (error) {
    document.getElementById("admin-metrics").innerHTML = `<div class="empty-state">${escapeHTML(error.message || t("adminLoadError"))}</div>`;
  }
}

function adminActionButtons(type, item) {
  const identifier = item.id;
  const status = item.status || "active";
  const lifecycleAction = type === "merchant" ? (status === "suspended" ? "restore" : "suspend") : (status === "hidden" ? "restore" : "hide");
  const lifecycleLabel = lifecycleAction === "restore" ? t("restore") : type === "merchant" ? t("suspend") : t("hideOffer");
  const editButton = ["brand", "model"].includes(type) ? `<button data-admin-action="edit" data-admin-type="${type}" data-admin-id="${escapeHTML(identifier)}">${t("edit")}</button>` : "";
  return `${editButton}<button data-admin-action="${lifecycleAction}" data-admin-type="${type}" data-admin-id="${escapeHTML(identifier)}">${lifecycleLabel}</button><button class="danger-text" data-admin-action="delete" data-admin-type="${type}" data-admin-id="${escapeHTML(identifier)}">${t("remove")}</button>`;
}

function renderAdmin() {
  if (!isAdmin()) return;
  const overview = adminData.overview;
  const metrics = [
    ["metricMerchants", overview.active_merchants], ["metricBrands", overview.active_brands], ["metricModels", overview.active_models], ["metricOffers", overview.active_offers], ["metricHiddenOffers", overview.hidden_offers],
  ];
  document.getElementById("admin-metrics").innerHTML = metrics.map(([label, value]) => `<article class="metric-card"><span>${t(label)}</span><strong>${Number(value || 0)}</strong></article>`).join("");
  document.getElementById("admin-brand-rows").innerHTML = adminData.brands.map((brand) => `<tr><td>${brand.id}</td><td><strong>${escapeHTML(brand.name)}</strong><small>${escapeHTML(brand.slug)}</small></td><td><span class="status-badge">${escapeHTML(brand.status)}</span></td><td class="row-actions">${adminActionButtons("brand", brand)}</td></tr>`).join("");
  document.querySelector('#model-form select[name="brandId"]').innerHTML = adminData.brands.map((brand) => `<option value="${brand.id}">${escapeHTML(brand.name)}</option>`).join("");
  document.getElementById("admin-model-rows").innerHTML = adminData.models.map((modelItem) => `<tr><td>${escapeHTML(modelItem.id)}</td><td>${escapeHTML(modelItem.brand_name)}</td><td><strong>${escapeHTML(modelItem.name)}</strong><small>${escapeHTML(modelItem.description || "")}</small></td><td><span class="status-badge">${escapeHTML(modelItem.status)}</span></td><td class="row-actions">${adminActionButtons("model", modelItem)}</td></tr>`).join("");
  document.getElementById("admin-merchant-rows").innerHTML = adminData.merchants.map((merchant) => `<tr><td><strong>${escapeHTML(merchant.name)}</strong><small>#${merchant.id}</small></td><td>${escapeHTML(merchant.email)}</td><td>${Number(merchant.offer_count || 0)}</td><td><span class="status-badge">${escapeHTML(merchant.status)}</span></td><td class="row-actions">${adminActionButtons("merchant", merchant)}</td></tr>`).join("");
  document.getElementById("admin-offer-rows").innerHTML = adminData.offers.map((offer) => `<tr><td>${offer.id}</td><td>${escapeHTML(offer.merchant_name)}</td><td>${escapeHTML(offer.model_name)}</td><td><strong>${escapeHTML(offer.channel_name)}</strong><small>#${offer.channel_slot}</small></td><td><span class="status-badge">${escapeHTML(offer.status)}</span></td><td class="row-actions">${adminActionButtons("offer", offer)}</td></tr>`).join("");
  document.getElementById("admin-audit-rows").innerHTML = adminData.logs.map((log) => `<tr><td>${escapeHTML(new Date(log.created_at).toLocaleString(lang))}</td><td>${escapeHTML(log.action)}</td><td>${escapeHTML(log.target_type)} #${escapeHTML(log.target_id)}</td><td>${escapeHTML(log.reason || "—")}</td></tr>`).join("");
  document.querySelectorAll("[data-admin-action]").forEach((button) => button.addEventListener("click", () => handleAdminAction(button)));
}

async function handleAdminAction(button) {
  const { adminAction: action, adminType: type, adminId: identifier } = button.dataset;
  if (action === "delete" && !window.confirm(t("deleteConfirm"))) return;
  try {
    if (action === "edit") {
      await editAdminItem(type, identifier);
    } else {
      const collection = type === "brand" ? "brands" : type === "model" ? "models" : type === "merchant" ? "merchants" : "offers";
      if (action === "delete") await api(`/api/admin/${collection}/${encodeURIComponent(identifier)}`, { method: "DELETE" });
      else {
        const reason = action === "hide" ? window.prompt(t("lifecycleReason"), "") ?? "" : "";
        await api(`/api/admin/${collection}/${encodeURIComponent(identifier)}/${action}`, { method: "POST", body: JSON.stringify({ reason }) });
      }
    }
    await Promise.all([loadAdminData(), loadCatalog(), loadPublicQuotes()]);
  } catch (error) {
    window.alert(error.message);
  }
}

async function editAdminItem(type, identifier) {
  if (type === "brand") {
    const brand = adminData.brands.find((item) => String(item.id) === String(identifier));
    const name = window.prompt(t("name"), brand?.name || "");
    if (!name) return;
    await api(`/api/admin/brands/${identifier}`, { method: "PUT", body: JSON.stringify({ name, logoUrl: brand.logo_url || "", sortOrder: brand.sort_order || 0 }) });
    return;
  }
  const modelItem = adminData.models.find((item) => String(item.id) === String(identifier));
  const name = window.prompt(t("name"), modelItem?.name || "");
  if (!name) return;
  await api(`/api/admin/models/${encodeURIComponent(identifier)}`, { method: "PUT", body: JSON.stringify({ name, brandId: modelItem.brand_id, description: modelItem.description || "", sortOrder: modelItem.sort_order || 0 }) });
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.getElementById("search-input").addEventListener("input", () => { currentPage = 1; renderQuotes(); });
  document.getElementById("sort-select").addEventListener("change", (event) => { sortDirection = event.target.value; currentPage = 1; renderQuotes(); });
  document.getElementById("page-size-select").addEventListener("change", (event) => { pageSize = Number(event.target.value); currentPage = 1; renderQuotes(); });
  document.getElementById("page-prev").addEventListener("click", () => { currentPage -= 1; renderQuotes(); });
  document.getElementById("page-next").addEventListener("click", () => { currentPage += 1; renderQuotes(); });
  window.addEventListener("scroll", syncQuoteSticky, { passive: true });
  window.addEventListener("resize", syncQuoteSticky);
  document.getElementById("lang-toggle").addEventListener("click", () => { lang = lang === "zh-CN" ? "en" : "zh-CN"; storage.set("model-market-lang", lang); applyI18n(); });
  document.getElementById("theme-toggle").addEventListener("click", () => { theme = theme === "light" ? "dark" : "light"; document.documentElement.className = `theme-${theme}`; storage.set("model-market-theme", theme); });
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("auth-status");
    status.textContent = "";
    try { await submitAuth("/api/auth/login", { email: document.getElementById("login-email").value, password: document.getElementById("login-password").value }); } catch (error) { status.textContent = error.message; }
  });
  document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("auth-status");
    const turnstileToken = window.turnstile && turnstileWidgetId !== null ? window.turnstile.getResponse(turnstileWidgetId) : "";
    if (!turnstileToken) { status.textContent = t("turnstileRequired"); return; }
    try {
      await submitAuth("/api/auth/register", { merchantName: document.getElementById("register-merchant-name").value, contact: document.getElementById("register-contact").value, email: document.getElementById("register-email").value, password: document.getElementById("register-password").value, turnstileToken });
    } catch (error) {
      status.textContent = error.message;
      if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    }
  });
  document.getElementById("logout-button").addEventListener("click", async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch (_) {} currentUser = null; merchantOffers = []; syncRoleUi(); setView("market"); });
  document.getElementById("model-select").addEventListener("change", (event) => { activeModel = event.target.value; activeBrand = selectedModel().brandName; renderOfferEditor(); });
  document.querySelectorAll(".offer-card").forEach((form) => {
    form.addEventListener("submit", (event) => { event.preventDefault(); saveOffer(form); });
    form.querySelectorAll("[data-offer-action]").forEach((button) => button.addEventListener("click", () => mutateOffer(form, button.dataset.offerAction)));
  });
  document.querySelectorAll("[data-admin-panel]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-admin-panel]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `admin-${button.dataset.adminPanel}`));
  }));
  document.getElementById("admin-refresh").addEventListener("click", loadAdminData);
  document.getElementById("brand-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.querySelector("[data-admin-message]");
    try { await api("/api/admin/brands", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); message.textContent = t("adminSaved"); await Promise.all([loadAdminData(), loadCatalog()]); } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("model-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.querySelector("[data-admin-message]");
    const payload = Object.fromEntries(new FormData(form));
    payload.brandId = Number(payload.brandId);
    try { await api("/api/admin/models", { method: "POST", body: JSON.stringify(payload) }); form.reset(); message.textContent = t("adminSaved"); await Promise.all([loadAdminData(), loadCatalog()]); } catch (error) { message.textContent = error.message; }
  });
  document.querySelectorAll("[data-close-modal]").forEach((node) => node.addEventListener("click", () => document.getElementById("contact-dialog").close()));
  document.getElementById("contact-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
}

bindEvents();
applyI18n();
syncRoleUi();
await loadCatalog();
await Promise.all([loadPublicQuotes(), refreshSession(), initializeTurnstile()]);
