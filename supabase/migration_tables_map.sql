-- =============================================
-- MYNOX — Mappa tavoli + aggiornamento dati reali
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- ─── 1. Aggiungi colonne posizione ai tavoli ──────────────────────────────────
alter table public.tables
  add column if not exists pos_x float default 0.5,
  add column if not exists pos_y float default 0.5,
  add column if not exists section text default 'Standard',
  add column if not exists table_number integer;

-- ─── 2. Aggiungi TikTok ai club ───────────────────────────────────────────────
update public.clubs set tiktok = 'hallpadova'          where id = '11111111-1111-1111-1111-111111111111';
update public.clubs set tiktok = 'factoryclubpd'       where id = '22222222-2222-2222-2222-222222222222';
update public.clubs set tiktok = 'extraextrapadova'    where id = '33333333-3333-3333-3333-333333333333';
update public.clubs set tiktok = 'fishmarketclub'      where id = '44444444-4444-4444-4444-444444444444';
update public.clubs set tiktok = 'magicclubveggiano'   where id = '55555555-5555-5555-5555-555555555555';

-- ─── 3. Aggiorna foto club ────────────────────────────────────────────────────
update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80'
where id = '11111111-1111-1111-1111-111111111111';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80'
where id = '22222222-2222-2222-2222-222222222222';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
where id = '33333333-3333-3333-3333-333333333333';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
where id = '44444444-4444-4444-4444-444444444444';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80'
where id = '55555555-5555-5555-5555-555555555555';

-- ─── 4. Aggiorna lineup eventi con DJ reali ───────────────────────────────────
-- Indie Power @ Hall
update public.events set
  lineup = '[{"name":"DJ LUCA V.","time":"23:00"},{"name":"ALTERNATIVE HOUR feat. MARCO T.","time":"01:30"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Teknobirrette @ Hall
update public.events set
  lineup = '[{"name":"RESIDENT: SIMONE B.","time":"23:00"},{"name":"GUEST B2B: NERO + VALE","time":"02:00"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80'
where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Bunny Club @ Hall
update public.events set
  lineup = '[{"name":"DJ MAMBO (Latin Set)","time":"23:00"},{"name":"REGGAETON HOUR feat. CARLOS M.","time":"01:00"},{"name":"CLOSING: DJ PICANTE","time":"02:30"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Teknobirrette Maggio
update public.events set
  lineup = '[{"name":"RESIDENT: SIMONE B.","time":"23:00"},{"name":"GUEST TBA","time":"02:00"}]'::jsonb
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Factory Techno Night
update public.events set
  lineup = '[{"name":"FACTORY RESIDENT: ANDREA K.","time":"23:00"},{"name":"GUEST: MIRA B2B THEO","time":"01:30"},{"name":"CLOSING: FACTORY ALL-STARS","time":"03:30"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80'
where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Factory Deep House
update public.events set
  lineup = '[{"name":"DEEP RESIDENT: ELENA F.","time":"23:00"},{"name":"B2B SET: SOUL + GROOVE","time":"01:30"}]'::jsonb
where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- ExtraExtra Venerdì
update public.events set
  lineup = '[{"name":"FLOOR 1 — TECHNO: ALEKSEI","time":"23:00"},{"name":"FLOOR 2 — COMMERCIAL: DJ SEBA","time":"23:00"},{"name":"FLOOR 1 — GUEST: YUKI","time":"02:00"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
where id = '66666666-6666-6666-6666-666666666666';

-- ExtraExtra Sabato
update public.events set
  lineup = '[{"name":"FLOOR 1 — TECHNO: RESIDENT","time":"23:00"},{"name":"FLOOR 2 — COMMERCIAL: DJ MAX","time":"23:00"}]'::jsonb
where id = '77777777-7777-7777-7777-777777777777';

-- Fishmarket
update public.events set
  lineup = '[{"name":"FISHMARKET DJ: GIACOMO R.","time":"22:30"},{"name":"SPECIAL GUEST","time":"00:30"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'
where id = '88888888-8888-8888-8888-888888888888';

-- Magic Club
update public.events set
  lineup = '[{"name":"UNDERGROUND RESIDENT: KAZIMIR","time":"23:00"},{"name":"GUEST TECHNO: LENA WILT","time":"01:30"},{"name":"CLOSING: VOID SET","time":"04:00"}]'::jsonb,
  image_url = 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80'
where id = '99999999-9999-9999-9999-999999999999';

-- ─── 5. Cancella tavoli esistenti e reinserisci con posizioni ─────────────────
delete from public.tables;

-- HALL PADOVA — Bunny Club (Latin/Reggaeton)
-- Sala con stage a sinistra, dance floor al centro, bar a destra
insert into public.tables (event_id, label, capacity, deposit, is_available, pos_x, pos_y, section, table_number) values
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo 4 pax',     4, 60.00,  true,  0.09, 0.60, 'Standard', 1),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo 4 pax',     4, 60.00,  true,  0.09, 0.78, 'Standard', 2),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo VIP 6 pax', 6, 120.00, true,  0.40, 0.84, 'VIP',      3),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo VIP 6 pax', 6, 120.00, false, 0.60, 0.84, 'VIP',      4),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo 4 pax',     4, 60.00,  true,  0.88, 0.60, 'Standard', 5),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo 4 pax',     4, 60.00,  true,  0.88, 0.78, 'Standard', 6);

-- EXTRAEXTRA — Venerdì
insert into public.tables (event_id, label, capacity, deposit, is_available, pos_x, pos_y, section, table_number) values
('66666666-6666-6666-6666-666666666666', 'Tavolo 4 pax',     4, 50.00,  true,  0.09, 0.66, 'Standard', 1),
('66666666-6666-6666-6666-666666666666', 'Tavolo VIP 6 pax', 6, 100.00, true,  0.50, 0.82, 'VIP',      2),
('66666666-6666-6666-6666-666666666666', 'Tavolo 4 pax',     4, 50.00,  false, 0.88, 0.66, 'Standard', 3);

-- EXTRAEXTRA — Sabato
insert into public.tables (event_id, label, capacity, deposit, is_available, pos_x, pos_y, section, table_number) values
('77777777-7777-7777-7777-777777777777', 'Tavolo 4 pax',     4, 50.00,  true,  0.09, 0.66, 'Standard', 1),
('77777777-7777-7777-7777-777777777777', 'Tavolo VIP 6 pax', 6, 100.00, true,  0.50, 0.82, 'VIP',      2),
('77777777-7777-7777-7777-777777777777', 'Tavolo 4 pax',     4, 50.00,  true,  0.88, 0.66, 'Standard', 3);

-- MAGIC CLUB — Underground Techno
insert into public.tables (event_id, label, capacity, deposit, is_available, pos_x, pos_y, section, table_number) values
('99999999-9999-9999-9999-999999999999', 'Tavolo VIP 4 pax', 4, 80.00,  true,  0.88, 0.54, 'VIP',      1),
('99999999-9999-9999-9999-999999999999', 'Tavolo 4 pax',     4, 60.00,  true,  0.09, 0.72, 'Standard', 2),
('99999999-9999-9999-9999-999999999999', 'Tavolo VIP 6 pax', 6, 130.00, false, 0.88, 0.78, 'VIP',      3),
('99999999-9999-9999-9999-999999999999', 'Tavolo 4 pax',     4, 60.00,  true,  0.09, 0.88, 'Standard', 4);
