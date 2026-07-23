PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT COLLATE NOCASE NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 48),
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'suspended')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  input_price_milli INTEGER NOT NULL CHECK(input_price_milli >= 0),
  cache_write_price_milli INTEGER NOT NULL CHECK(cache_write_price_milli >= 0),
  output_price_milli INTEGER NOT NULL CHECK(output_price_milli >= 0),
  cache_read_price_milli INTEGER NOT NULL CHECK(cache_read_price_milli >= 0),
  channel_note TEXT NOT NULL DEFAULT '' CHECK(length(channel_note) <= 60),
  updated_at INTEGER NOT NULL,
  UNIQUE(merchant_id, model_id)
);

CREATE INDEX quotes_model_updated_idx ON quotes(model_id, updated_at DESC);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('register', 'login')),
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX auth_attempts_window_idx ON auth_attempts(kind, ip_hash, created_at);
