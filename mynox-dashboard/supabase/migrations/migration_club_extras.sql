-- Catalogo extras definito a livello club (come i tavoli)
CREATE TABLE IF NOT EXISTS club_extras (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  deposit      NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url    TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS club_extras_club_id ON club_extras(club_id);

-- Extras per evento (abilita/disabilita e override prezzo, come le tables)
CREATE TABLE IF NOT EXISTS event_extras (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  club_extra_id  UUID NOT NULL REFERENCES club_extras(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  deposit        NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(event_id, club_extra_id)
);
CREATE INDEX IF NOT EXISTS event_extras_event_id ON event_extras(event_id);

-- Colonna per salvare gli extras ordinati sul biglietto
-- formato: [{"extraId":"...", "label":"...", "quantity":2, "unitDeposit":40.00}]
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '[]'::jsonb;
