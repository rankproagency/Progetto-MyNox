-- Tabella per rate limiting persistente tra i restart del proxy
CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip       text        NOT NULL,
  endpoint text        NOT NULL,
  window_start timestamptz NOT NULL,
  count    integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, endpoint, window_start)
);

-- RPC: increment atomico + check. Ritorna true se la richiesta è da bloccare.
-- Pulisce anche le righe scadute (> 5 min) ad ogni chiamata.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip           text,
  p_endpoint     text,
  p_window_start timestamptz,
  p_max          integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '5 minutes';

  INSERT INTO public.rate_limits (ip, endpoint, window_start, count)
  VALUES (p_ip, p_endpoint, p_window_start, 1)
  ON CONFLICT (ip, endpoint, window_start) DO UPDATE
    SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count > p_max;
END;
$$;
