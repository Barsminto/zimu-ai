import { filterQuotes, paginateQuotes, sortQuotes } from "./app-state.js?v=20260723-6";

const MODELS = [
  { id: "gpt-5-6", name: "GPT-5.6", brand: "OpenAI" },
  { id: "gpt-5-6-mini", name: "GPT-5.6 mini", brand: "OpenAI" },
  { id: "gpt-5-6-nano", name: "GPT-5.6 nano", brand: "OpenAI" },
  { id: "gpt-5-6-reasoning", name: "GPT-5.6 reasoning", brand: "OpenAI" },
];
const MARKET_MODELS = [
  ...MODELS,
  { id: "claude-sonnet", name: "Claude Sonnet", brand: "Anthropic" },
  { id: "grok-4", name: "Grok 4", brand: "xAI" },
  { id: "deepseek-v3", name: "DeepSeek V3", brand: "DeepSeek" },
];
const BRANDS = ["OpenAI", "Anthropic", "xAI", "DeepSeek"];
const MERCHANT_ID = "demo-merchant";
const SEED_MERCHANTS = {
  "aurora-api": { id: "aurora-api", name: "Aurora API", contact: "hello@aurora.example", description: "稳定的 GPT-5.6 系列中转服务" },
  northstar: { id: "northstar", name: "Northstar Cloud", contact: "@northstar_api", description: "面向开发者的透明计费 API" },
  "moss-labs": { id: "moss-labs", name: "Moss Labs", contact: "moss@example.com", description: "低延迟模型接入与稳定性优先" },
  [MERCHANT_ID]: { id: MERCHANT_ID, name: "Aurora API", contact: "hello@aurora.example", description: "稳定的 GPT-5.6 系列中转服务" },
};
const SEED_QUOTES = [
  { id: "q-1", merchantId: "aurora-api", modelId: "gpt-5-6", inputPrice: 8.8, outputPrice: 35.2, note: "按量计费，余额永不过期", updatedAt: "2026-07-22" },
  { id: "q-2", merchantId: "northstar", modelId: "gpt-5-6", inputPrice: 7.6, outputPrice: 31.8, note: "支持 OpenAI 兼容接口", updatedAt: "2026-07-21" },
  { id: "q-3", merchantId: "moss-labs", modelId: "gpt-5-6", inputPrice: 9.2, outputPrice: 34.5, note: "高峰期稳定保障", updatedAt: "2026-07-20" },
  { id: "q-4", merchantId: "aurora-api", modelId: "gpt-5-6-mini", inputPrice: 1.2, outputPrice: 4.8, note: "适合批量任务", updatedAt: "2026-07-22" },
  { id: "q-5", merchantId: "northstar", modelId: "gpt-5-6-mini", inputPrice: 1.05, outputPrice: 4.2, note: "新商户优惠中", updatedAt: "2026-07-19" },
  { id: "q-6", merchantId: "moss-labs", modelId: "gpt-5-6-reasoning", inputPrice: 14.8, outputPrice: 58.6, note: "推理模型专线", updatedAt: "2026-07-18" },
  { id: "q-7", merchantId: "aurora-api", modelId: "gpt-5-6-nano", inputPrice: 0.35, outputPrice: 1.4, note: "轻量任务首选", updatedAt: "2026-07-17" },
  { id: "q-8", merchantId: "northstar", modelId: "claude-sonnet", inputPrice: 18.5, outputPrice: 76, note: "长上下文稳定服务", updatedAt: "2026-07-16" },
  { id: "q-9", merchantId: "moss-labs", modelId: "grok-4", inputPrice: 12.6, outputPrice: 50.4, note: "实时任务专线", updatedAt: "2026-07-15" },
  { id: "q-10", merchantId: "aurora-api", modelId: "deepseek-v3", inputPrice: 2.1, outputPrice: 8.4, note: "开发测试优惠", updatedAt: "2026-07-14" },
];
const SEED_QUOTE_NOTES = ["OpenAI 兼容接口", "企业用量可议", "支持高并发", "余额长期有效", "新用户优惠", "稳定节点服务"];
const SAMPLE_MERCHANTS = Array.from({ length: 120 }, (_, index) => {
  const number = index + 1;
  const id = `relay-${number}`;
  return [id, { id, name: `Relay Hub ${String(number).padStart(2, "0")}`, contact: `relay${number}@example.com`, description: "公开模型中转报价服务" }];
});
Object.assign(SEED_MERCHANTS, Object.fromEntries(SAMPLE_MERCHANTS));
const EXPANDED_SEED_QUOTES = Array.from({ length: 840 }, (_, index) => {
  const [merchantId] = SAMPLE_MERCHANTS[index % SAMPLE_MERCHANTS.length];
  const item = MARKET_MODELS[index % MARKET_MODELS.length];
  const multiplier = 0.78 + ((index * 7) % 28) / 100;
  const baseInput = [8.2, 1.1, 0.32, 14.3, 18.2, 12.3, 2][index % MARKET_MODELS.length];
  const baseOutput = [33.8, 4.4, 1.28, 57.2, 74.4, 49.8, 8.1][index % MARKET_MODELS.length];
  const inputPrice = Number((baseInput * multiplier).toFixed(2));
  const outputPrice = Number((baseOutput * multiplier).toFixed(2));
  return { id: `sample-${index + 1}`, merchantId, modelId: item.id, inputPrice, cacheWritePrice: Number((inputPrice * 0.25).toFixed(2)), outputPrice, cacheReadPrice: Number((outputPrice * 0.1).toFixed(2)), note: SEED_QUOTE_NOTES[index % SEED_QUOTE_NOTES.length], updatedAt: `2026-07-${String(23 - (index % 18)).padStart(2, "0")}` };
});

const I18N = {
  "zh-CN": {
    brandSub: "模型中转报价市场", navMarket: "报价市场", navMerchant: "商户中心", merchantEntry: "商户入口", themeToggle: "切换主题", eyebrow: "公开目录 · 实时比较", heroTitle: "找到适合你的<br><em>模型报价。</em>", heroCopy: "汇集模型中转服务商的公开价格，帮助你更快做出选择。", heroNote: "数据由商户自行维护<br>联系前请先确认条款", brandFilterTitle: "快速选择品牌", modelFilterTitle: "快速选择模型", searchPlaceholder: "搜索模型或商户", sortLabel: "排序", sortDefault: "最近更新", sortLow: "价格最低", sortHigh: "价格最高", quoteEyebrow: "价格目录", quoteTitle: "所有上架报价", workspaceEyebrow: "商户工作台 · 演示模式", workspaceTitle: "管理你的公开报价。", workspaceCopy: "更新模型价格，让潜在用户找到你的服务。", demoBadge: "本地演示数据", loginTitle: "进入商户中心", loginCopy: "这是一个静态预览。点击进入后，将以「Aurora API」演示商户身份操作。", loginButton: "进入演示中心", localOnly: "不会上传到服务器，仅保存在当前浏览器。", merchantDesc: "稳定的 GPT-5.6 系列中转服务", logout: "退出", quoteManageEyebrow: "我的报价", quoteManageTitle: "更新模型价格", onePerModel: "每个模型一条", modelLabel: "模型", channelDescription: "渠道说明", inputPrice: "输入价 · 元 / 1M", outputPrice: "输出价 · 元 / 1M", channelPlaceholder: "例如：新用户首月 9 折", saveQuote: "保存报价", previewEyebrow: "公开预览", previewTitle: "访客看到的样子", footerDisclaimer: "价格仅供参考，交易请自行核验", openSource: "Open source ↗", docs: "使用说明", contactEyebrow: "联系商户", contactCopy: "以下联系方式来自商户公开信息，联系时请说明你需要的模型与用量。", input: "输入", output: "输出", updated: "更新于", tokens: "元 / 百万 Tokens", empty: "没有找到匹配的报价。", saved: "报价已保存到本浏览器。", required: "请填写完整的价格。", demoData: "演示数据", contact: "联系", perPage: "每页", rows: "条", previousPage: "上一页", nextPage: "下一页"
  },
  en: {
    brandSub: "Model relay price market", navMarket: "Market", navMerchant: "Merchant center", merchantEntry: "For providers", themeToggle: "Toggle theme", eyebrow: "PUBLIC DIRECTORY · LIVE COMPARISON", heroTitle: "Find the right<br><em>model pricing.</em>", heroCopy: "Compare public prices from model relay providers in one place.", heroNote: "Maintained by each provider<br>Confirm terms before contacting", brandFilterTitle: "Quick brand filters", modelFilterTitle: "Quick model filters", searchPlaceholder: "Search models or providers", sortLabel: "Sort", sortDefault: "Recently updated", sortLow: "Lowest price", sortHigh: "Highest price", quoteEyebrow: "PRICE DIRECTORY", quoteTitle: "All listed quotes", workspaceEyebrow: "PROVIDER WORKSPACE · DEMO", workspaceTitle: "Manage your public quotes.", workspaceCopy: "Update model pricing so potential users can find your service.", demoBadge: "Local demo data", loginTitle: "Enter merchant center", loginCopy: "This is a static preview. Continue as the demo provider “Aurora API”.", loginButton: "Enter demo center", localOnly: "Nothing is uploaded. Changes stay in this browser.", merchantDesc: "Reliable GPT-5.6 relay service", logout: "Log out", quoteManageEyebrow: "MY QUOTES", quoteManageTitle: "Update model pricing", onePerModel: "One per model", modelLabel: "Model", channelDescription: "Channel notes", inputPrice: "Input · CNY / 1M", outputPrice: "Output · CNY / 1M", channelPlaceholder: "e.g. 10% off for new users", saveQuote: "Save quote", previewEyebrow: "PUBLIC PREVIEW", previewTitle: "What visitors see", footerDisclaimer: "Prices are indicative. Verify terms before transacting.", openSource: "Open source ↗", docs: "Docs", contactEyebrow: "CONTACT PROVIDER", contactCopy: "This contact is supplied publicly by the provider. Mention your model and expected usage.", input: "Input", output: "Output", updated: "Updated", tokens: "CNY / 1M tokens", empty: "No matching quotes found.", saved: "Quote saved in this browser.", required: "Please enter both prices.", demoData: "Demo data", contact: "Contact", perPage: "Rows", rows: "per page", previousPage: "Previous page", nextPage: "Next page"
  },
};

Object.assign(I18N["zh-CN"], {
  merchant: "商户",
  inputPrice: "输入价 / 缓存（1M）",
  outputPrice: "输出价 / 缓存（1M）",
  cacheWritePrice: "缓存生成价（1M）",
  cacheReadPrice: "缓存读取价（1M）",
  openSource: "开源代码 ↗",
  required: "请填写完整的价格。",
  loginTab: "登录",
  registerTab: "注册",
  emailLabel: "邮箱",
  passwordLabel: "密码",
  merchantNameLabel: "商户名称",
  contactLabel: "公开联系方式",
  contactPlaceholder: "例如：邮箱、Telegram 或微信",
  registerButton: "创建商户账户",
  reviewPending: "账户已创建，报价将在审核通过后公开展示。",
  loginCopy: "注册后即可维护你公开展示的模型报价。",
  loginButton: "登录",
  merchantDesc: "维护你公开展示的模型报价。",
  authUnavailable: "认证服务暂不可用，请稍后再试。",
  turnstileRequired: "请先完成人机验证。",
});
Object.assign(I18N.en, {
  merchant: "Provider",
  inputPrice: "Input / cache (1M)",
  outputPrice: "Output / cache (1M)",
  cacheWritePrice: "Cache write (1M)",
  cacheReadPrice: "Cache read (1M)",
  required: "Please enter all prices.",
  loginTab: "Sign in",
  registerTab: "Register",
  emailLabel: "Email",
  passwordLabel: "Password",
  merchantNameLabel: "Provider name",
  contactLabel: "Public contact",
  contactPlaceholder: "Email, Telegram, or another public channel",
  registerButton: "Create provider account",
  reviewPending: "Your account is created. Quotes will be listed after review.",
  authUnavailable: "Authentication is temporarily unavailable.",
  turnstileRequired: "Please complete the verification first.",
});

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} },
};
let lang = storage.get("model-market-lang") || "zh-CN";
let theme = storage.get("model-market-theme") || "light";
let localQuotes = read("model-market-quotes", []);
if (!Array.isArray(localQuotes)) localQuotes = [];
let loggedIn = false;
let currentUser = null;
let remoteQuotes = null;
let turnstileWidgetId = null;
let activeBrand = BRANDS[0];
let activeModel = MARKET_MODELS.find((item) => item.brand === activeBrand).id;
let sortDirection = "default";
let currentPage = 1;
let pageSize = 20;

function read(key, fallback) { try { const value = storage.get(key); return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; } }
function save(key, value) { storage.set(key, JSON.stringify(value)); }
function t(key) { const messages = I18N[lang] || I18N["zh-CN"]; return messages[key] || I18N.en[key] || key; }
function allQuotes() {
  if (Array.isArray(remoteQuotes)) return remoteQuotes;
  const savedQuotes = Array.isArray(localQuotes) ? localQuotes : [];
  const seeds = [...SEED_QUOTES, ...EXPANDED_SEED_QUOTES];
  return [...savedQuotes, ...seeds.filter((seed) => !savedQuotes.some((local) => local.merchantId === seed.merchantId && local.modelId === seed.modelId))].map((quote) => ({
    ...quote,
    cacheWritePrice: Number.isFinite(Number(quote.cacheWritePrice)) ? Number(quote.cacheWritePrice) : Number((Number(quote.inputPrice) * 0.25).toFixed(2)),
    cacheReadPrice: Number.isFinite(Number(quote.cacheReadPrice)) ? Number(quote.cacheReadPrice) : Number((Number(quote.outputPrice) * 0.1).toFixed(2)),
  }));
}
function merchant(id) { return SEED_MERCHANTS[id] || { id, name: "商户", contact: "", description: "" }; }
function model(id) { return MARKET_MODELS.find((item) => item.id === id) || MODELS[0]; }
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function activeMerchantId() { return currentUser?.merchant?.id || MERCHANT_ID; }

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.innerHTML = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
  document.getElementById("lang-toggle").textContent = lang === "zh-CN" ? "EN" : "中文";
  renderQuickFilters();
  renderQuotes();
  renderPreview();
}

async function loadRemoteQuotes() {
  try {
    const response = await fetch("/api/quotes", { headers: { Accept: "application/json" } });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
    const data = await response.json();
    if (!Array.isArray(data.quotes)) return;
    remoteQuotes = data.quotes.map((quote) => ({ ...quote, id: `${quote.merchantId}-${quote.modelId}` }));
    data.quotes.forEach((quote) => { SEED_MERCHANTS[quote.merchantId] = { id: quote.merchantId, name: quote.merchantName, contact: quote.merchantContact || "", description: "" }; });
    renderQuotes();
    renderPreview();
    if (loggedIn) loadQuoteForm();
  } catch (_) {}
}

async function refreshSession() {
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" }, credentials: "same-origin" });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
    const data = await response.json();
    if (!data.user?.merchant) return;
    currentUser = data.user;
    loggedIn = true;
    SEED_MERCHANTS[currentUser.merchant.id] = { id: currentUser.merchant.id, name: currentUser.merchant.name, contact: currentUser.merchant.contact || "", description: "" };
    startDashboard();
    loadQuoteForm();
    renderPreview();
  } catch (_) {}
}

async function initializeTurnstile() {
  try {
    const response = await fetch("/api/public-config", { headers: { Accept: "application/json" } });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
    const { turnstileSiteKey } = await response.json();
    if (!turnstileSiteKey) return;
    await new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    turnstileWidgetId = window.turnstile.render("#turnstile-widget", { sitekey: turnstileSiteKey, action: "register", theme: theme === "dark" ? "dark" : "light" });
  } catch (_) {}
}

function setAuthMode(mode) {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === mode));
  document.getElementById("login-form").classList.toggle("hidden", mode !== "login");
  document.getElementById("register-form").classList.toggle("hidden", mode !== "register");
  document.getElementById("auth-status").textContent = "";
}

async function submitAuth(endpoint, payload) {
  const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || t("authUnavailable"));
  currentUser = data.user;
  loggedIn = true;
  SEED_MERCHANTS[currentUser.merchant.id] = { id: currentUser.merchant.id, name: currentUser.merchant.name, contact: currentUser.merchant.contact || "", description: "" };
  startDashboard();
  loadQuoteForm();
  renderPreview();
  await loadRemoteQuotes();
  if (data.user?.merchant?.status === "pending") document.getElementById("auth-status").textContent = t("reviewPending");
}

function renderQuickFilters() {
  document.getElementById("brand-filters").innerHTML = BRANDS.map((brand) => `<button class="quick-option ${activeBrand === brand ? "is-active" : ""}" data-brand="${brand}">${brand}</button>`).join("");
  const visibleModels = MARKET_MODELS.filter((item) => item.brand === activeBrand);
  document.getElementById("model-filters").innerHTML = visibleModels.map((item) => `<button class="quick-option ${activeModel === item.id ? "is-active" : ""}" data-model="${item.id}">${item.name}</button>`).join("");
  document.querySelectorAll("[data-brand]").forEach((node) => node.addEventListener("click", () => {
    activeBrand = node.dataset.brand;
    if (model(activeModel).brand !== activeBrand) activeModel = MARKET_MODELS.find((item) => item.brand === activeBrand).id;
    currentPage = 1;
    renderQuickFilters();
    renderQuotes();
  }));
  document.querySelectorAll("[data-model]").forEach((node) => node.addEventListener("click", () => {
    activeModel = node.dataset.model;
    activeBrand = model(activeModel).brand;
    currentPage = 1;
    renderQuickFilters();
    renderQuotes();
  }));
}

function renderQuotes() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  let quotes = allQuotes().map((quote) => ({ ...quote, merchantName: merchant(quote.merchantId).name, modelName: model(quote.modelId).name, brand: model(quote.modelId).brand }));
  quotes = filterQuotes(quotes, { query, brand: activeBrand, model: activeModel });
  quotes = sortQuotes(quotes, sortDirection);
  const pagination = paginateQuotes(quotes, currentPage, pageSize);
  currentPage = pagination.page;
  const grid = document.getElementById("quote-list");
  document.getElementById("quote-count").textContent = `${quotes.length} ${lang === "zh-CN" ? "条报价" : "quotes"}`;
  const selectedModel = model(activeModel);
  const tableColumns = `<colgroup class="quote-table-columns"><col class="quote-col-merchant"><col class="quote-col-channel"><col class="quote-col-input"><col class="quote-col-output"><col class="quote-col-updated"><col class="quote-col-action"></colgroup>`;
  const tableHeader = `<tr><th>${t("merchant")}</th><th>${t("channelDescription")}</th><th>${t("inputPrice")}</th><th>${t("outputPrice")}</th><th>${t("updated")}</th><th></th></tr>`;
  grid.innerHTML = quotes.length ? `<div class="quote-model-sticky"><div class="quote-sticky-title"><strong>${escapeHTML(selectedModel.name)}</strong><span>${escapeHTML(selectedModel.brand)}</span></div><table class="quote-table quote-sticky-table">${tableColumns}<thead>${tableHeader}</thead></table></div><div class="quote-table-wrap"><table class="quote-table">${tableColumns}<thead>${tableHeader}</thead><tbody>${pagination.items.map((quote) => { const m = merchant(quote.merchantId); return `<tr><td><strong>${escapeHTML(m.name)}</strong></td><td class="channel-cell" title="${escapeHTML(quote.note || "")}">${escapeHTML(quote.note || "—")}</td><td class="price-cell"><span>¥${quote.inputPrice.toFixed(2)}</span><small>¥${quote.cacheWritePrice.toFixed(2)}</small></td><td class="price-cell"><span>¥${quote.outputPrice.toFixed(2)}</span><small>¥${quote.cacheReadPrice.toFixed(2)}</small></td><td>${escapeHTML(quote.updatedAt || "—")}</td><td><button class="contact-button" data-contact="${m.id}">${t("contact")}</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty-state">${t("empty")}</div>`;
  grid.querySelectorAll("[data-contact]").forEach((button) => button.addEventListener("click", () => openContact(button.dataset.contact)));
  document.getElementById("page-size-select").value = String(pageSize);
  document.getElementById("page-summary").textContent = `${pagination.page} / ${pagination.totalPages}`;
  document.getElementById("page-prev").disabled = pagination.page === 1;
  document.getElementById("page-next").disabled = pagination.page === pagination.totalPages;
  syncQuoteSticky();
}

function syncQuoteSticky() {
  const list = document.getElementById("quote-list");
  const stickyTitle = list.querySelector(".quote-model-sticky");
  const header = document.querySelector(".site-header");
  if (!stickyTitle || !header) return;

  const headerHeight = Math.ceil(header.getBoundingClientRect().height);
  const listRect = list.getBoundingClientRect();
  const shouldStick = listRect.top <= headerHeight && listRect.bottom > headerHeight + 96;
  stickyTitle.classList.toggle("is-visible", shouldStick);
  document.body.classList.toggle("quote-title-visible", shouldStick);
  document.documentElement.style.setProperty("--site-header-height", `${headerHeight}px`);
  if (shouldStick) {
    stickyTitle.style.left = `${listRect.left}px`;
    stickyTitle.style.width = `${listRect.width}px`;
  }
}

function renderPreview() {
  const merchantId = activeMerchantId();
  const mine = allQuotes().filter((quote) => String(quote.merchantId) === String(merchantId));
  const currentMerchant = merchant(merchantId);
  document.getElementById("my-preview").innerHTML = `<div class="preview-summary"><div class="avatar">M</div><div><strong>${escapeHTML(currentMerchant.name)}</strong><p>${t("merchantDesc")}</p></div><span class="demo-badge">${t("demoData")}</span></div><div class="mini-quotes">${mine.map((quote) => `<div><span>${model(quote.modelId).name}</span><strong>¥${quote.inputPrice.toFixed(2)} / ¥${quote.cacheWritePrice.toFixed(2)}</strong><small>¥${quote.outputPrice.toFixed(2)} / ¥${quote.cacheReadPrice.toFixed(2)}</small></div>`).join("")}</div>`;
}
function openContact(id = MERCHANT_ID) { const m = merchant(id); document.getElementById("contact-name").textContent = m.name; document.getElementById("contact-details").innerHTML = `<div><span>✉</span><strong>${escapeHTML(m.contact)}</strong></div><p>${escapeHTML(m.description)}</p>`; document.getElementById("contact-dialog").showModal(); }
function setView(view) { document.querySelectorAll(".view").forEach((node) => node.classList.toggle("is-visible", node.id === `${view}-view`)); document.querySelectorAll("[data-view]").forEach((node) => node.classList.toggle("is-active", node.dataset.view === view)); window.scrollTo({ top: 0, behavior: "smooth" }); }
function populateForm() { document.getElementById("model-select").innerHTML = MODELS.map((item) => `<option value="${item.id}">${item.name}</option>`).join(""); loadQuoteForm(); }
function loadQuoteForm() { const quote = allQuotes().find((item) => String(item.merchantId) === String(activeMerchantId()) && item.modelId === document.getElementById("model-select").value); document.getElementById("input-price").value = quote?.inputPrice ?? ""; document.getElementById("input-cache-price").value = quote?.cacheWritePrice ?? ""; document.getElementById("output-price").value = quote?.outputPrice ?? ""; document.getElementById("output-cache-price").value = quote?.cacheReadPrice ?? ""; document.getElementById("quote-note").value = quote?.note ?? ""; }
function startDashboard() { document.getElementById("login-card").classList.toggle("hidden", loggedIn); document.getElementById("dashboard").classList.toggle("hidden", !loggedIn); if (loggedIn) document.getElementById("merchant-name").textContent = currentUser?.merchant?.name || merchant(activeMerchantId()).name; }

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((node) => node.addEventListener("click", () => { if (node.dataset.view === "merchant") startDashboard(); setView(node.dataset.view); }));
  document.getElementById("search-input").addEventListener("input", () => { currentPage = 1; renderQuotes(); });
  document.getElementById("sort-select").addEventListener("change", (event) => { sortDirection = event.target.value; currentPage = 1; renderQuotes(); });
  document.getElementById("page-size-select").addEventListener("change", (event) => { pageSize = Number(event.target.value); currentPage = 1; renderQuotes(); });
  document.getElementById("page-prev").addEventListener("click", () => { currentPage -= 1; renderQuotes(); });
  document.getElementById("page-next").addEventListener("click", () => { currentPage += 1; renderQuotes(); });
  window.addEventListener("scroll", syncQuoteSticky, { passive:true });
  window.addEventListener("resize", syncQuoteSticky);
  document.getElementById("lang-toggle").addEventListener("click", () => { lang = lang === "zh-CN" ? "en" : "zh-CN"; save("model-market-lang", lang); applyI18n(); });
  document.getElementById("theme-toggle").addEventListener("click", () => { theme = theme === "light" ? "dark" : "light"; document.documentElement.className = `theme-${theme}`; save("model-market-theme", theme); });
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("auth-status");
    status.textContent = "";
    try {
      await submitAuth("/api/auth/login", { email: document.getElementById("login-email").value, password: document.getElementById("login-password").value });
    } catch (error) { status.textContent = error.message; }
  });
  document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("auth-status");
    const turnstileToken = window.turnstile && turnstileWidgetId !== null ? window.turnstile.getResponse(turnstileWidgetId) : "";
    if (!turnstileToken) { status.textContent = t("turnstileRequired"); return; }
    status.textContent = "";
    try {
      await submitAuth("/api/auth/register", { merchantName: document.getElementById("register-merchant-name").value, contact: document.getElementById("register-contact").value, email: document.getElementById("register-email").value, password: document.getElementById("register-password").value, turnstileToken });
    } catch (error) { status.textContent = error.message; if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId); }
  });
  document.getElementById("logout-button").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } }).catch(() => {});
    loggedIn = false;
    currentUser = null;
    startDashboard();
  });
  document.getElementById("model-select").addEventListener("change", loadQuoteForm);
  document.getElementById("quote-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const inputPrice = Number(document.getElementById("input-price").value);
    const cacheWritePrice = Number(document.getElementById("input-cache-price").value);
    const outputPrice = Number(document.getElementById("output-price").value);
    const cacheReadPrice = Number(document.getElementById("output-cache-price").value);
    const status = document.getElementById("quote-status");
    if (![inputPrice, cacheWritePrice, outputPrice, cacheReadPrice].every(Number.isFinite)) { status.textContent = t("required"); return; }
    const modelId = document.getElementById("model-select").value;
    try {
      const response = await fetch(`/api/merchant/quotes/${encodeURIComponent(modelId)}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ inputPrice, cacheWritePrice, outputPrice, cacheReadPrice, note: document.getElementById("quote-note").value.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("authUnavailable"));
      status.textContent = t("saved");
      await loadRemoteQuotes();
      loadQuoteForm();
    } catch (error) { status.textContent = error.message; }
  });
  document.querySelectorAll("[data-close-modal]").forEach((node) => node.addEventListener("click", () => document.getElementById("contact-dialog").close()));
  document.getElementById("contact-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
}

populateForm();
bindEvents();
startDashboard();
applyI18n();
loadRemoteQuotes();
refreshSession();
initializeTurnstile();
