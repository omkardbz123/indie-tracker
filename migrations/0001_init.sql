CREATE TABLE IF NOT EXISTS dogs (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  dog_type        TEXT NOT NULL DEFAULT 'pet',
  photo_key       TEXT,
  breed           TEXT,
  gender          TEXT,
  sterilized      INTEGER NOT NULL DEFAULT 0,
  sterilized_date TEXT,
  vaccinated      INTEGER NOT NULL DEFAULT 0,
  vaccinated_date TEXT,
  owner_name      TEXT NOT NULL,
  phone           TEXT NOT NULL,
  area            TEXT,
  address         TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
