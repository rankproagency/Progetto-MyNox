-- Fix TOCTOU race condition on free ticket per-account limit.
-- The old proxy did SELECT count + INSERT as two separate REST calls, allowing
-- parallel requests to both pass the count check before either inserted.
-- This RPC acquires a transaction-level advisory lock keyed on (user_id, ticket_type_id),
-- then checks the count and inserts atomically in the same transaction.
--
-- Called by stripe-proxy POST /create-free-ticket instead of the direct REST insert.
CREATE OR REPLACE FUNCTION create_free_tickets_atomic(
  p_user_id        UUID,
  p_event_id       UUID,
  p_ticket_type_id UUID,
  p_table_id       UUID,
  p_table_name     TEXT,
  p_quantity       INT,
  p_includes_drink BOOLEAN,
  p_extras         JSONB,
  p_tickets        JSONB  -- [{id, qr_code, drink_qr_code, entry_code}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count  INT;
  v_ticket JSONB;
  v_ids    UUID[] := '{}';
BEGIN
  -- Acquire transaction-level advisory lock for this (user_id, ticket_type_id) pair.
  -- Released automatically at commit/rollback — count check and inserts are atomic.
  IF p_ticket_type_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      ('x' || left(md5(p_user_id::text || '::' || p_ticket_type_id::text), 16))::bit(64)::bigint
    );

    SELECT COUNT(*) INTO v_count
    FROM tickets
    WHERE user_id        = p_user_id
      AND ticket_type_id = p_ticket_type_id;

    IF v_count + p_quantity > 5 THEN
      RETURN jsonb_build_object('error', 'limit_exceeded');
    END IF;
  END IF;

  BEGIN
    FOR i IN 0 .. jsonb_array_length(p_tickets) - 1 LOOP
      v_ticket := p_tickets -> i;
      INSERT INTO tickets (
        id, event_id, user_id, ticket_type_id, table_id, table_name,
        qr_code, drink_qr_code, drink_used, status, price_paid,
        stripe_payment_intent_id, entry_code, extras
      ) VALUES (
        (v_ticket ->> 'id')::UUID,
        p_event_id,
        p_user_id,
        p_ticket_type_id,
        p_table_id,
        p_table_name,
        v_ticket ->> 'qr_code',
        CASE WHEN p_includes_drink THEN v_ticket ->> 'drink_qr_code' ELSE NULL END,
        false,
        'valid',
        0,
        NULL,
        v_ticket ->> 'entry_code',
        COALESCE(p_extras, '[]'::jsonb)
      );
      v_ids := array_append(v_ids, (v_ticket ->> 'id')::UUID);
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%table_already_booked%' THEN
        RETURN jsonb_build_object('error', 'table_already_booked');
      END IF;
      IF SQLERRM LIKE '%tickets_sold_out%' THEN
        RETURN jsonb_build_object('error', 'tickets_sold_out');
      END IF;
      IF SQLERRM LIKE '%extra_sold_out%' THEN
        RETURN jsonb_build_object('error', SQLERRM);
      END IF;
      RAISE;
  END;

  RETURN jsonb_build_object('ids', to_jsonb(v_ids));
END;
$$;

REVOKE ALL ON FUNCTION create_free_tickets_atomic(UUID, UUID, UUID, UUID, TEXT, INT, BOOLEAN, JSONB, JSONB)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_free_tickets_atomic(UUID, UUID, UUID, UUID, TEXT, INT, BOOLEAN, JSONB, JSONB)
  TO service_role;
