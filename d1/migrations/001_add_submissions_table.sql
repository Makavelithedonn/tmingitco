-- Migration 001: Add submissions table

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  client_phone TEXT NOT NULL, -- HMAC hashed phone/email
  masked_phone TEXT,          -- simple masked phone for admin display
  card_id TEXT,
  name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- 'pending','accepted','rejected'
  admin_notes TEXT,
  processed_at DATETIME,
  processed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
