-- Failed admin password attempts, for rate limiting sign-in.
CREATE TABLE admin_login_failures (
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_admin_login_failures ON admin_login_failures (ip_hash, created_at);
