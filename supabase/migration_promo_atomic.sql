-- A1: increment_promo_uses atomico e condizionato.
-- Incrementa SOLO se il codice è ancora valido e non ha raggiunto max_uses.
-- Restituisce TRUE se l'incremento è riuscito, FALSE se il codice è esaurito/scaduto/inattivo.
-- Sostituisce la vecchia funzione che incrementava incondizionatamente.
CREATE OR REPLACE FUNCTION increment_promo_uses(p_promo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated UUID;
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  RETURNING id INTO v_updated;

  RETURN v_updated IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION increment_promo_uses(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_uses(UUID) TO service_role;
