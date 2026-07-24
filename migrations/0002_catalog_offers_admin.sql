PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'merchant' CHECK(role IN ('merchant', 'admin'));

ALTER TABLE merchants ADD COLUMN hidden_at INTEGER;
ALTER TABLE merchants ADD COLUMN hidden_by INTEGER;
ALTER TABLE merchants ADD COLUMN hidden_reason TEXT NOT NULL DEFAULT '' CHECK(length(hidden_reason) <= 240);
ALTER TABLE merchants ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1));

CREATE TABLE brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 64),
  logo_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 96),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 300),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(brand_id, slug)
);

CREATE INDEX models_brand_status_idx ON models(brand_id, status, sort_order, name);

CREATE TABLE offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  channel_slot INTEGER NOT NULL CHECK(channel_slot IN (1, 2)),
  channel_name TEXT NOT NULL CHECK(length(channel_name) BETWEEN 1 AND 64),
  channel_contact TEXT NOT NULL DEFAULT '' CHECK(length(channel_contact) <= 120),
  channel_url TEXT NOT NULL DEFAULT '' CHECK(length(channel_url) <= 300),
  channel_region TEXT NOT NULL DEFAULT '' CHECK(length(channel_region) <= 48),
  channel_currency TEXT NOT NULL DEFAULT 'CNY' CHECK(length(channel_currency) BETWEEN 3 AND 8),
  channel_note TEXT NOT NULL DEFAULT '' CHECK(length(channel_note) <= 120),
  input_price_milli INTEGER NOT NULL CHECK(input_price_milli >= 0),
  cache_write_price_milli INTEGER NOT NULL CHECK(cache_write_price_milli >= 0),
  output_price_milli INTEGER NOT NULL CHECK(output_price_milli >= 0),
  cache_read_price_milli INTEGER NOT NULL CHECK(cache_read_price_milli >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden')),
  hidden_at INTEGER,
  hidden_by INTEGER,
  hidden_reason TEXT NOT NULL DEFAULT '' CHECK(length(hidden_reason) <= 240),
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(merchant_id, model_id, channel_slot)
);

CREATE INDEX offers_public_idx ON offers(status, model_id, updated_at DESC);
CREATE INDEX offers_merchant_idx ON offers(merchant_id, model_id, channel_slot);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL CHECK(length(action) BETWEEN 1 AND 48),
  target_type TEXT NOT NULL CHECK(length(target_type) BETWEEN 1 AND 48),
  target_id TEXT NOT NULL CHECK(length(target_id) BETWEEN 1 AND 96),
  reason TEXT NOT NULL DEFAULT '' CHECK(length(reason) <= 240),
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id, created_at DESC);

INSERT OR IGNORE INTO brands (slug, name, status, sort_order, created_at, updated_at)
VALUES
  ('openai', 'OpenAI', 'active', 10, unixepoch() * 1000, unixepoch() * 1000),
  ('anthropic', 'Anthropic', 'active', 20, unixepoch() * 1000, unixepoch() * 1000),
  ('xai', 'xAI', 'active', 30, unixepoch() * 1000, unixepoch() * 1000),
  ('deepseek', 'DeepSeek', 'active', 40, unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO models (id, brand_id, slug, name, description, status, sort_order, created_at, updated_at)
SELECT 'gpt-5-6', id, 'gpt-5-6', 'GPT-5.6', '通用模型', 'active', 10, unixepoch() * 1000, unixepoch() * 1000 FROM brands WHERE slug = 'openai'
UNION ALL
SELECT 'gpt-5-6-mini', id, 'gpt-5-6-mini', 'GPT-5.6 mini', '轻量模型', 'active', 20, unixepoch() * 1000, unixepoch() * 1000 FROM brands WHERE slug = 'openai'
UNION ALL
SELECT 'gpt-5-6-nano', id, 'gpt-5-6-nano', 'GPT-5.6 nano', '低成本模型', 'active', 30, unixepoch() * 1000, unixepoch() * 1000 FROM brands WHERE slug = 'openai'
UNION ALL
SELECT 'gpt-5-6-reasoning', id, 'gpt-5-6-reasoning', 'GPT-5.6 reasoning', '推理模型', 'active', 40, unixepoch() * 1000, unixepoch() * 1000 FROM brands WHERE slug = 'openai';

INSERT OR IGNORE INTO offers (
  merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_note,
  input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli,
  status, created_at, updated_at
)
SELECT
  q.merchant_id,
  q.model_id,
  1,
  '默认渠道',
  COALESCE(m.contact, ''),
  q.channel_note,
  q.input_price_milli,
  q.cache_write_price_milli,
  q.output_price_milli,
  q.cache_read_price_milli,
  CASE WHEN m.status = 'active' AND m.hidden_at IS NULL THEN 'active' ELSE 'hidden' END,
  q.updated_at,
  q.updated_at
FROM quotes q
JOIN merchants m ON m.id = q.merchant_id
JOIN models model ON model.id = q.model_id;
