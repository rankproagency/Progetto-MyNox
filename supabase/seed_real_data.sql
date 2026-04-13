-- =============================================
-- MYNOX — Dati reali Padova
-- Incolla nel SQL Editor di Supabase
-- =============================================

-- Pulisci i dati mock precedenti
delete from public.tables;
delete from public.ticket_types;
delete from public.events;
delete from public.clubs;

-- ─────────────────────────────────────────────
-- CLUB REALI DI PADOVA
-- ─────────────────────────────────────────────
insert into public.clubs (id, name, city, address, instagram, image_url) values
(
  '11111111-1111-1111-1111-111111111111',
  'Hall Padova',
  'Padova',
  'Via Nona Strada 11b, Padova',
  'hallpadova',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80'
),
(
  '22222222-2222-2222-2222-222222222222',
  'Factory Club',
  'Padova',
  'Via Savelli 114, Sarmeola di Rubano, Padova',
  'factoryclub.padova',
  'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80'
),
(
  '33333333-3333-3333-3333-333333333333',
  'ExtraExtra',
  'Padova',
  'Via Giacomo Ciamician 5, Padova',
  'extraextrapadova',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
),
(
  '44444444-4444-4444-4444-444444444444',
  'Fishmarket Club',
  'Padova',
  'Via fra Paolo Sarpi 37, Padova',
  'fishmarketclub',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80'
),
(
  '55555555-5555-5555-5555-555555555555',
  'Magic Club',
  'Padova',
  'Via Enrico Fermi 40, Veggiano (PD)',
  'magicclubveggiano',
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&q=80'
);

-- ─────────────────────────────────────────────
-- EVENTI REALI / BASATI SU DATI VERIFICATI
-- ─────────────────────────────────────────────
insert into public.events (id, club_id, name, description, date, start_time, image_url, genres, dress_code, capacity, tickets_sold, lineup) values

-- HALL PADOVA — serate verificate da rivieradisco.it
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Indie Power',
  'La serata indie più amata di Padova. I migliori indie rock, alternative e britpop in un''unica notte. Atmosfera universitaria, prezzi studente.',
  '2026-04-17', '23:00',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  '{Commercial}', 'Casual', 1000, 320,
  '[{"name":"DJ INDIE SET","time":"23:00"},{"name":"ALTERNATIVE HOUR","time":"01:30"}]'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Teknobirrette',
  'Techno e birra artigianale. La formula che ha conquistato Padova: musica elettronica seria a prezzo popolare. Sound system professionale, luci stroboscopiche, vibe underground.',
  '2026-04-18', '23:00',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  '{Techno,House}', 'No dress code', 1000, 480,
  '[{"name":"RESIDENT DJ","time":"23:00"},{"name":"GUEST B2B","time":"02:00"}]'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Bunny Club',
  'La serata latina e reggaeton di Hall. Salsa, bachata, reggaeton e i migliori hit latini del momento. Dance floor aperto dalle 23:00.',
  '2026-04-25', '23:00',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  '{Latin,Reggaeton}', 'Smart casual', 1000, 210,
  '[{"name":"DJ LATINO","time":"23:00"},{"name":"REGGAETON HOUR","time":"01:00"}]'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'Teknobirrette — Maggio',
  'Il ritorno della formula vincente. Techno, house e birra artigianale. Ogni secondo sabato del mese ad Hall Padova.',
  '2026-05-09', '23:00',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  '{Techno,House}', 'No dress code', 1000, 0,
  '[{"name":"RESIDENT DJ","time":"23:00"},{"name":"GUEST","time":"02:00"}]'
),

-- FACTORY CLUB — techno/house, circolo ARCI
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'Factory — Techno Night',
  'Il tempio della musica elettronica a Padova. Factory Club ospita i migliori DJ della scena techno e house italiana ed europea. Circolazione d''aria, sound system curato, atmosfera underground.',
  '2026-04-19', '23:00',
  'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80',
  '{Techno,House}', 'No sportivo', 400, 180,
  '[{"name":"FACTORY RESIDENT","time":"23:00"},{"name":"GUEST DJ","time":"02:00"}]'
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '22222222-2222-2222-2222-222222222222',
  'Factory — Deep House Session',
  'Una notte dedicata alle sonorità più profonde della house music. Atmosfera intima, luci calde e un sound che ti porta dalle radici Chicago fino ai club di Berlino.',
  '2026-05-02', '23:00',
  'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80',
  '{House,"Deep House"}', 'No dress code', 400, 0,
  '[{"name":"DEEP RESIDENT","time":"23:00"},{"name":"B2B SET","time":"02:00"}]'
),

-- EXTRAEXTRA — due piani, under 35
(
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333',
  'ExtraExtra — Venerdì',
  'Due piani di musica: al piano superiore techno e house, al piano inferiore commercial, hip-hop e reggaeton. Il locale under 35 più frequentato di Padova.',
  '2026-04-24', '23:00',
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&q=80',
  '{Techno,Commercial,"Hip-Hop",Reggaeton}', 'Smart casual', 600, 95,
  '[{"name":"FLOOR 1 — TECHNO DJ","time":"23:00"},{"name":"FLOOR 2 — COMMERCIAL DJ","time":"23:00"}]'
),
(
  '77777777-7777-7777-7777-777777777777',
  '33333333-3333-3333-3333-333333333333',
  'ExtraExtra — Sabato',
  'Il sabato di ExtraExtra è il più atteso della settimana. Due piani, due mondi: underground e commercial. Per chi non vuole scegliere.',
  '2026-05-02', '23:00',
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&q=80',
  '{Techno,Commercial,Reggaeton}', 'Smart casual', 600, 0,
  '[{"name":"FLOOR 1 DJ","time":"23:00"},{"name":"FLOOR 2 DJ","time":"23:00"}]'
),

-- FISHMARKET CLUB — universitari, indie
(
  '88888888-8888-8888-8888-888888888888',
  '44444444-4444-4444-4444-444444444444',
  'Fishmarket — Indie & Dance',
  'Il club universitario di Padova. Indie, dance, reggae e commerciale in un''atmosfera rilassata e inclusiva. Circolo ARCI, tessera richiesta.',
  '2026-04-18', '22:30',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  '{Commercial,"Hip-Hop"}', 'Casual', 300, 120,
  '[{"name":"FISHMARKET DJ","time":"22:30"}]'
),

-- MAGIC CLUB — techno underground, Veggiano
(
  '99999999-9999-9999-9999-999999999999',
  '55555555-5555-5555-5555-555555555555',
  'Magic Club — Underground Techno',
  'L''esperienza techno più intensa della provincia di Padova. Magic Club a Veggiano è il riferimento per chi cerca musica elettronica seria, atmosfera frenetica e sound system da paura.',
  '2026-04-26', '23:00',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  '{Techno}', 'All black preferred', 500, 230,
  '[{"name":"UNDERGROUND RESIDENT","time":"23:00"},{"name":"GUEST TECHNO DJ","time":"02:00"}]'
);

-- ─────────────────────────────────────────────
-- TICKET TYPES
-- ─────────────────────────────────────────────
insert into public.ticket_types (event_id, label, price, includes_drink, total_quantity, sold_quantity) values
-- Indie Power (€3 verificato)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ingresso', 3.00, false, 500, 320),

-- Teknobirrette (€7 verificato)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ingresso', 7.00, false, 600, 480),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ingresso + Birra', 10.00, true, 200, 80),

-- Bunny Club
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Donna', 8.00, true, 300, 210),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Uomo',  12.00, true, 200, 0),

-- Teknobirrette Maggio
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ingresso', 7.00, false, 600, 0),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ingresso + Birra', 10.00, true, 200, 0),

-- Factory Techno Night
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Socio', 8.00, true, 200, 180),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Non socio', 12.00, true, 100, 0),

-- Factory Deep House
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Socio', 8.00, true, 200, 0),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Non socio', 12.00, true, 100, 0),

-- ExtraExtra Venerdì
('66666666-6666-6666-6666-666666666666', 'Donna', 8.00,  true, 250, 95),
('66666666-6666-6666-6666-666666666666', 'Uomo',  12.00, true, 200, 0),

-- ExtraExtra Sabato
('77777777-7777-7777-7777-777777777777', 'Donna', 10.00, true, 250, 0),
('77777777-7777-7777-7777-777777777777', 'Uomo',  15.00, true, 200, 0),

-- Fishmarket
('88888888-8888-8888-8888-888888888888', 'Socio ARCI', 5.00, true, 200, 120),
('88888888-8888-8888-8888-888888888888', 'Tessera + Ingresso', 8.00, true, 100, 0),

-- Magic Club
('99999999-9999-9999-9999-999999999999', 'Donna', 10.00, true, 200, 130),
('99999999-9999-9999-9999-999999999999', 'Uomo',  15.00, true, 200, 100);

-- ─────────────────────────────────────────────
-- TAVOLI (solo locali che li offrono)
-- ─────────────────────────────────────────────
insert into public.tables (event_id, label, capacity, deposit, is_available) values
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo 4 pax', 4, 60.00, true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tavolo VIP 6 pax', 6, 120.00, true),
('66666666-6666-6666-6666-666666666666', 'Tavolo 4 pax', 4, 50.00, true),
('77777777-7777-7777-7777-777777777777', 'Tavolo 4 pax', 4, 50.00, true),
('99999999-9999-9999-9999-999999999999', 'Tavolo VIP 4 pax', 4, 80.00, true);
