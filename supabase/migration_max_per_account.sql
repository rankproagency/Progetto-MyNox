-- Limite massimo di biglietti acquistabili per account per tipo biglietto.
-- NULL = nessun limite. Utile soprattutto per biglietti gratuiti o in omaggio.

alter table public.ticket_types
  add column if not exists max_per_account integer default null;
