PRAGMA foreign_keys = ON;

INSERT INTO users (email, password_hash, password_salt, created_at)
VALUES
  ('aurora@example.test', 'WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw', 'bG9jYWwtc2VlZC0yMDI2IQ', 1784534400000),
  ('northstar@example.test', 'WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw', 'bG9jYWwtc2VlZC0yMDI2IQ', 1784534400000),
  ('lattice@example.test', 'WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw', 'bG9jYWwtc2VlZC0yMDI2IQ', 1784534400000),
  ('pending@example.test', 'WcXj47biHHu5UvsTFKld83q0wJ3yABq85VNl-uY9Fxw', 'bG9jYWwtc2VlZC0yMDI2IQ', 1784534400000)
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  created_at = excluded.created_at;

INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at)
SELECT id, 'Aurora API', 'support@aurora.example.test', 'active', 1784534400000, 1784793600000
FROM users WHERE email = 'aurora@example.test'
ON CONFLICT(user_id) DO UPDATE SET
  name = excluded.name,
  contact = excluded.contact,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at)
SELECT id, 'Northstar Relay', '@northstar_demo', 'active', 1784534400000, 1784707200000
FROM users WHERE email = 'northstar@example.test'
ON CONFLICT(user_id) DO UPDATE SET
  name = excluded.name,
  contact = excluded.contact,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at)
SELECT id, 'Lattice Cloud', 'demo-wechat:lattice-cloud', 'active', 1784534400000, 1784620800000
FROM users WHERE email = 'lattice@example.test'
ON CONFLICT(user_id) DO UPDATE SET
  name = excluded.name,
  contact = excluded.contact,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

INSERT INTO merchants (user_id, name, contact, status, created_at, updated_at)
SELECT id, 'Pending Sandbox', 'pending@example.test', 'pending', 1784534400000, 1784534400000
FROM users WHERE email = 'pending@example.test'
ON CONFLICT(user_id) DO UPDATE SET
  name = excluded.name,
  contact = excluded.contact,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6', 1250, 1450, 9850, 180, '稳定线路 · 工作日支持', 1784793600000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'aurora@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-mini', 350, 420, 2200, 80, '适合批量轻任务', 1784793600000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'aurora@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-nano', 90, 120, 650, 25, '低延迟共享通道', 1784793600000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'aurora@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-reasoning', 2100, 2350, 12800, 320, '推理任务优先队列', 1784793600000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'aurora@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6', 1180, 1380, 10100, 170, '新用户测试额度', 1784707200000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'northstar@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-mini', 320, 390, 2300, 75, '高并发线路', 1784707200000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'northstar@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-nano', 85, 110, 690, 22, '适合工具调用', 1784707200000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'northstar@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-reasoning', 1980, 2280, 13200, 300, '独立推理通道', 1784707200000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'northstar@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6', 1320, 1500, 9600, 190, '企业工单支持', 1784620800000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'lattice@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-mini', 370, 440, 2100, 85, '按量计费无月租', 1784620800000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'lattice@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-nano', 95, 125, 620, 28, '轻量任务优化', 1784620800000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'lattice@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-reasoning', 2200, 2450, 12400, 340, '长上下文稳定线路', 1784620800000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'lattice@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6', 900, 1100, 8000, 100, '待审核测试报价', 1784534400000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'pending@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-mini', 250, 300, 1800, 50, '待审核测试报价', 1784534400000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'pending@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-nano', 60, 80, 500, 15, '待审核测试报价', 1784534400000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'pending@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;

INSERT INTO quotes (merchant_id, model_id, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, channel_note, updated_at)
SELECT m.id, 'gpt-5-6-reasoning', 1600, 1900, 10500, 220, '待审核测试报价', 1784534400000
FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'pending@example.test'
ON CONFLICT(merchant_id, model_id) DO UPDATE SET
  input_price_milli = excluded.input_price_milli,
  cache_write_price_milli = excluded.cache_write_price_milli,
  output_price_milli = excluded.output_price_milli,
  cache_read_price_milli = excluded.cache_read_price_milli,
  channel_note = excluded.channel_note,
  updated_at = excluded.updated_at;
