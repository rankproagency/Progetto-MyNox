-- =============================================
-- MYNOX — Prezzi e capacità reali Padova
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- ─── HALL PADOVA ─────────────────────────────────────────────────────────────
-- Capacità reale: ~1200. Prezzi verificati rivieradisco.it
update public.events set capacity = 1200, tickets_sold = 0
  where club_id = '11111111-1111-1111-1111-111111111111';

-- Indie Power: €3 ingresso (verificato)
update public.ticket_types set price = 3.00, total_quantity = 600, sold_quantity = 0
  where event_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and label = 'Ingresso';

-- Teknobirrette: €7 ingresso, €10 con birra artigianale (verificato)
update public.ticket_types set price = 7.00,  total_quantity = 700, sold_quantity = 0
  where event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and label = 'Ingresso';
update public.ticket_types set price = 10.00, total_quantity = 250, sold_quantity = 0
  where event_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and label = 'Ingresso + Birra';

-- Bunny Club: donna €8 con drink, uomo €12 con drink
update public.ticket_types set price = 8.00,  total_quantity = 400, sold_quantity = 0
  where event_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and label = 'Donna';
update public.ticket_types set price = 12.00, total_quantity = 300, sold_quantity = 0
  where event_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and label = 'Uomo';

-- Teknobirrette Maggio
update public.ticket_types set price = 7.00,  total_quantity = 700, sold_quantity = 0
  where event_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and label = 'Ingresso';
update public.ticket_types set price = 10.00, total_quantity = 250, sold_quantity = 0
  where event_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and label = 'Ingresso + Birra';

-- ─── FACTORY CLUB ─────────────────────────────────────────────────────────────
-- Capacità reale: ~400. Circolo ARCI — tessera obbligatoria
update public.events set capacity = 400, tickets_sold = 0
  where club_id = '22222222-2222-2222-2222-222222222222';

-- Socio ARCI ~€8-10 con drink, non socio ~€12-15 con drink + tessera
update public.ticket_types set price = 8.00,  total_quantity = 250, sold_quantity = 0
  where event_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and label = 'Socio';
update public.ticket_types set price = 13.00, total_quantity = 150, sold_quantity = 0
  where event_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and label = 'Non socio';

update public.ticket_types set price = 8.00,  total_quantity = 250, sold_quantity = 0
  where event_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' and label = 'Socio';
update public.ticket_types set price = 13.00, total_quantity = 150, sold_quantity = 0
  where event_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' and label = 'Non socio';

-- ─── EXTRAEXTRA ──────────────────────────────────────────────────────────────
-- Capacità reale: ~700 (due piani)
update public.events set capacity = 700, tickets_sold = 0
  where club_id = '33333333-3333-3333-3333-333333333333';

-- Venerdì: donna €8 con drink, uomo €12 con drink
update public.ticket_types set price = 8.00,  total_quantity = 300, sold_quantity = 0
  where event_id = '66666666-6666-6666-6666-666666666666' and label = 'Donna';
update public.ticket_types set price = 12.00, total_quantity = 250, sold_quantity = 0
  where event_id = '66666666-6666-6666-6666-666666666666' and label = 'Uomo';

-- Sabato: donna €10 con drink, uomo €15 con drink
update public.ticket_types set price = 10.00, total_quantity = 300, sold_quantity = 0
  where event_id = '77777777-7777-7777-7777-777777777777' and label = 'Donna';
update public.ticket_types set price = 15.00, total_quantity = 250, sold_quantity = 0
  where event_id = '77777777-7777-7777-7777-777777777777' and label = 'Uomo';

-- ─── FISHMARKET CLUB ─────────────────────────────────────────────────────────
-- Capacità reale: ~250. Circolo ARCI universitario
update public.events set capacity = 250, tickets_sold = 0
  where club_id = '44444444-4444-4444-4444-444444444444';

-- Socio ARCI €5 con drink, tessera + ingresso €8
update public.ticket_types set price = 5.00, total_quantity = 180, sold_quantity = 0
  where event_id = '88888888-8888-8888-8888-888888888888' and label = 'Socio ARCI';
update public.ticket_types set price = 8.00, total_quantity = 70,  sold_quantity = 0
  where event_id = '88888888-8888-8888-8888-888888888888' and label = 'Tessera + Ingresso';

-- ─── MAGIC CLUB ──────────────────────────────────────────────────────────────
-- Capacità reale: ~500. Club underground a Veggiano
update public.events set capacity = 500, tickets_sold = 0
  where club_id = '55555555-5555-5555-5555-555555555555';

-- Donna €10 con drink, uomo €15 con drink
update public.ticket_types set price = 10.00, total_quantity = 250, sold_quantity = 0
  where event_id = '99999999-9999-9999-9999-999999999999' and label = 'Donna';
update public.ticket_types set price = 15.00, total_quantity = 250, sold_quantity = 0
  where event_id = '99999999-9999-9999-9999-999999999999' and label = 'Uomo';
