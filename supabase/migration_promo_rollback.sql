-- Rollback atomico di un uso promo: chiamato se Stripe fallisce dopo increment_promo_uses.
CREATE OR REPLACE FUNCTION public.decrement_promo_uses(p_promo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.promo_codes
  SET current_uses = GREATEST(0, current_uses - 1)
  WHERE id = p_promo_id
    AND current_uses > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_promo_uses(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_promo_uses(UUID) TO service_role;
