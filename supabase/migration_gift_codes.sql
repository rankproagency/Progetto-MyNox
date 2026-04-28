-- Tabella per i codici regalo biglietti
CREATE TABLE IF NOT EXISTS gift_codes (
  code        TEXT PRIMARY KEY,
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  gifter_id   UUID NOT NULL REFERENCES auth.users(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at  TIMESTAMPTZ,
  claimed_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE gift_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON gift_codes USING (false);
