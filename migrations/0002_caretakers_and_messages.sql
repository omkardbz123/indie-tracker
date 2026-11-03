-- Caretaker accounts sign in with a personal login link (only a hash of the token is stored).
CREATE TABLE caretakers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,                              -- PRIVATE
  area          TEXT,
  token_hash    TEXT UNIQUE,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Finders now contact caretakers through anonymous messages, so owner contact becomes optional
-- private data, and each dog can belong to a caretaker account.
CREATE TABLE dogs_new (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  dog_type        TEXT NOT NULL DEFAULT 'pet',     -- 'pet' | 'community'
  photo_key       TEXT,                            -- version suffix of R2 key dogs/<id>/<photo_key>
  breed           TEXT,
  gender          TEXT,                            -- 'male' | 'female' | NULL
  sterilized      INTEGER NOT NULL DEFAULT 0,
  sterilized_date TEXT,
  vaccinated      INTEGER NOT NULL DEFAULT 0,
  vaccinated_date TEXT,
  caretaker_id    TEXT,                            -- caretakers.id; NULL = handled by admins
  owner_name      TEXT,                            -- PRIVATE
  phone           TEXT,                            -- PRIVATE, digits with country code
  area            TEXT,                            -- PUBLIC
  address         TEXT,                            -- PRIVATE
  notes           TEXT,                            -- PUBLIC
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO dogs_new (id, name, dog_type, photo_key, breed, gender, sterilized, sterilized_date, vaccinated,
  vaccinated_date, owner_name, phone, area, address, notes, created_at, updated_at)
SELECT id, name, dog_type, photo_key, breed, gender, sterilized, sterilized_date, vaccinated,
  vaccinated_date, owner_name, phone, area, address, notes, created_at, updated_at FROM dogs;
DROP TABLE dogs;
ALTER TABLE dogs_new RENAME TO dogs;
CREATE INDEX idx_dogs_caretaker ON dogs (caretaker_id);

-- One conversation per finder per dog. The finder proves ownership with a random token kept in their browser.
CREATE TABLE conversations (
  id                TEXT PRIMARY KEY,
  dog_id            TEXT NOT NULL,
  finder_token_hash TEXT NOT NULL,
  finder_name       TEXT,
  ip_hash           TEXT,                          -- for rate limiting only
  unread_staff      INTEGER NOT NULL DEFAULT 0,
  unread_finder     INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_conversations_dog ON conversations (dog_id);
CREATE INDEX idx_conversations_last ON conversations (last_message_at);
CREATE INDEX idx_conversations_ip ON conversations (ip_hash, created_at);

CREATE TABLE messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  sender          TEXT NOT NULL,                   -- 'finder' | 'caretaker' | 'admin'
  body            TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, id);
