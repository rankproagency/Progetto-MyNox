-- Aggiunge marketing_consent al tipo di ritorno di get_crm_contacts.
-- Necessario per evitare il valore hardcoded nel CRM della dashboard.
-- La funzione continua a filtrare solo chi ha marketing_consent = true.
-- DROP necessario perché CREATE OR REPLACE non permette di cambiare il tipo di ritorno.
DROP FUNCTION IF EXISTS get_crm_contacts(uuid, text, uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_crm_contacts(
  p_club_id   UUID,
  p_search    TEXT    DEFAULT '',
  p_event_id  UUID    DEFAULT NULL,
  p_limit     INT     DEFAULT 50,
  p_offset    INT     DEFAULT 0
)
RETURNS TABLE (
  ticket_id          UUID,
  created_at         TIMESTAMPTZ,
  event_id           UUID,
  event_name         TEXT,
  event_date         DATE,
  user_id            UUID,
  user_name          TEXT,
  user_email         TEXT,
  marketing_consent  BOOLEAN,
  total_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT DISTINCT ON (p.id)
      t.id            AS ticket_id,
      t.created_at,
      t.event_id,
      e.name          AS event_name,
      e.date          AS event_date,
      p.id            AS user_id,
      p.name          AS user_name,
      p.email         AS user_email,
      p.marketing_consent
    FROM tickets t
    JOIN profiles p ON p.id = t.user_id
    JOIN events   e ON e.id = t.event_id
    WHERE e.club_id = p_club_id
      AND p.marketing_consent = true
      AND (p_event_id IS NULL OR t.event_id = p_event_id)
      AND (
        p_search = ''
        OR p.name  ILIKE '%' || p_search || '%'
        OR p.email ILIKE '%' || p_search || '%'
      )
    ORDER BY p.id, t.created_at DESC
  )
  SELECT
    base.*,
    COUNT(*) OVER () AS total_count
  FROM base
  ORDER BY base.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION get_crm_contacts(UUID, TEXT, UUID, INT, INT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_crm_contacts(UUID, TEXT, UUID, INT, INT) TO service_role;
