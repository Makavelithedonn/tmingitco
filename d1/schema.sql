-- D1 schema for cards
CREATE TABLE IF NOT EXISTS cards (
  card_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_cards_phone_hash ON cards(phone_hash);
