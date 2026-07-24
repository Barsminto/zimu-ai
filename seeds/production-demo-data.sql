PRAGMA foreign_keys = ON;

-- This file is intentionally explicit. It is never loaded by deploy.
-- The demo users use random one-way password records and are not login accounts.
INSERT INTO users (email, password_hash, password_salt, role, created_at)
VALUES
  ('demo-aurora@example.test', 'hiCftKkDW7FHBHs_4IoPl_Idan-Tazfeyyxl63ePhQg', 'tsPV-xjj1QO7cvqKuEhiOA', 'merchant', 1784534400000),
  ('demo-northstar@example.test', 'g_ANDBJgqGk487UxeTjhbMPMYdD57JnCDqNQ8OMVzgQ', 'F-AzMfuEK0eE2gPZDB7STg', 'merchant', 1784534400000)
ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, password_salt = excluded.password_salt, role = 'merchant';

INSERT INTO merchants (user_id, name, contact, status, is_demo, created_at, updated_at)
SELECT id, 'Aurora Demo', 'demo-aurora@example.test', 'active', 1, 1784534400000, 1784793600000 FROM users WHERE email = 'demo-aurora@example.test'
ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, contact = excluded.contact, status = 'active', is_demo = 1, updated_at = excluded.updated_at;
INSERT INTO merchants (user_id, name, contact, status, is_demo, created_at, updated_at)
SELECT id, 'Northstar Demo', 'demo-northstar@example.test', 'active', 1, 1784534400000, 1784793600000 FROM users WHERE email = 'demo-northstar@example.test'
ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, contact = excluded.contact, status = 'active', is_demo = 1, updated_at = excluded.updated_at;

INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_url, channel_region, channel_currency, channel_note, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, is_demo, created_at, updated_at)
SELECT m.id, 'gpt-5-6', 1, 'Aurora Global', 'demo-aurora@example.test', 'https://example.test/aurora', 'Global', 'CNY', 'Demo channel', 8800, 2200, 35200, 3520, 'active', 1, 1784534400000, 1784793600000 FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'demo-aurora@example.test'
ON CONFLICT(merchant_id, model_id, channel_slot) DO UPDATE SET channel_name = excluded.channel_name, channel_contact = excluded.channel_contact, channel_url = excluded.channel_url, status = 'active', is_demo = 1, updated_at = excluded.updated_at;
INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_url, channel_region, channel_currency, channel_note, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, is_demo, created_at, updated_at)
SELECT m.id, 'gpt-5-6', 2, 'Aurora CN', 'demo-aurora@example.test', 'https://example.test/aurora-cn', 'CN', 'CNY', 'Demo channel', 9200, 2300, 36800, 3680, 'active', 1, 1784534400000, 1784793600000 FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'demo-aurora@example.test'
ON CONFLICT(merchant_id, model_id, channel_slot) DO UPDATE SET channel_name = excluded.channel_name, channel_contact = excluded.channel_contact, channel_url = excluded.channel_url, status = 'active', is_demo = 1, updated_at = excluded.updated_at;
INSERT INTO offers (merchant_id, model_id, channel_slot, channel_name, channel_contact, channel_url, channel_region, channel_currency, channel_note, input_price_milli, cache_write_price_milli, output_price_milli, cache_read_price_milli, status, is_demo, created_at, updated_at)
SELECT m.id, 'gpt-5-6', 1, 'Northstar Standard', 'demo-northstar@example.test', 'https://example.test/northstar', 'Global', 'CNY', 'Demo channel', 7600, 1900, 31800, 3180, 'active', 1, 1784534400000, 1784707200000 FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = 'demo-northstar@example.test'
ON CONFLICT(merchant_id, model_id, channel_slot) DO UPDATE SET channel_name = excluded.channel_name, channel_contact = excluded.channel_contact, channel_url = excluded.channel_url, status = 'active', is_demo = 1, updated_at = excluded.updated_at;

-- Cleanup: DELETE FROM offers WHERE is_demo = 1; DELETE FROM merchants WHERE is_demo = 1; DELETE FROM users WHERE email LIKE 'demo-%@example.test';
