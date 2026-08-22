-- Indice parziale su pending_refunds per rimborsi non ancora processati.
-- Senza questo, la query WHERE refunded_at IS NULL fa full table scan.

CREATE INDEX IF NOT EXISTS idx_pending_refunds_unprocessed
  ON public.pending_refunds(created_at)
  WHERE refunded_at IS NULL;
