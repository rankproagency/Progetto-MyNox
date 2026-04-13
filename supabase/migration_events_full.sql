-- Aggiungi campi mancanti alla tabella events
alter table public.events
  add column if not exists dress_code text default 'No dress code',
  add column if not exists capacity integer default 500,
  add column if not exists tickets_sold integer default 0,
  add column if not exists lineup jsonb default '[]',
  add column if not exists instagram text,
  add column if not exists tiktok text;

-- Aggiungi campi mancanti ai club
alter table public.clubs
  add column if not exists instagram text,
  add column if not exists tiktok text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists image_url text;

-- Aggiorna i club con dati completi
update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  address = 'Via Interporto, Padova',
  instagram = 'altromondostudios',
  tiktok = 'altromondostudios',
  email = 'info@altromondostudios.it',
  phone = '+39 049 123 4567'
where id = '11111111-1111-1111-1111-111111111111';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  address = 'Via Roma 12, Padova',
  instagram = 'byblosclub.pd',
  tiktok = 'byblosclub',
  email = 'info@byblosclub.it',
  phone = '+39 049 765 4321'
where id = '22222222-2222-2222-2222-222222222222';

update public.clubs set
  image_url = 'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80',
  address = 'Via Venezia 5, Padova',
  instagram = 'newageclub.pd',
  tiktok = 'newageclub',
  email = 'info@newageclub.it',
  phone = '+39 049 987 6543'
where id = '33333333-3333-3333-3333-333333333333';

-- Cancella eventi mock precedenti e reinserisci completi
delete from public.ticket_types where event_id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);
delete from public.events where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Inserisci 6 eventi completi
insert into public.events (id, club_id, name, description, date, start_time, image_url, genres, dress_code, capacity, tickets_sold, lineup) values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'NEXUS — Techno Night',
  'Una notte di techno dura e cruda negli spazi industriali di Altromondo Studios. Quattro ore di set continui, luci stroboscopiche e sound system Funktion-One da 40.000 watt.',
  '2026-04-18', '23:00',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  '{Techno,House}', 'Elegante / No sportivo', 800, 134,
  '[{"name":"KOSMIK","time":"23:00"},{"name":"PHASE ERROR","time":"01:00"},{"name":"DRVG CVLTVRE","time":"03:00"}]'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'NEON — Pop & RnB',
  'NEON è la serata mainstream del Byblos — i più grandi hit internazionali di Pop, RnB e Hip-Hop. Open bar dalle 22:00 alle 23:00.',
  '2026-04-19', '22:00',
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&q=80',
  '{Pop,RnB,"Hip-Hop"}', 'Smart casual', 600, 41,
  '[{"name":"DJ FRESHH","time":"22:00"},{"name":"PRINCE OF THE BOOTH","time":"00:00"}]'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  'REQUIEM — Special Edition',
  'L''evento più atteso dell''anno al New Age. Una notte senza compromessi con la lineup più forte mai portata a Padova. 300 posti.',
  '2026-04-26', '23:00',
  'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  '{Techno,House}', 'All black', 300, 300,
  '[{"name":"BLAWAN","time":"23:00"},{"name":"SHACKLETON","time":"01:00"},{"name":"MANNI DEH","time":"03:30"}]'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'TROPICANA — Latin Vibes',
  'La serata latina più calda di Padova torna al Byblos. Salsa, bachata, reggaeton e i migliori hit latini del momento.',
  '2026-05-02', '22:30',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  '{Latin,Reggaeton}', 'Smart casual', 600, 87,
  '[{"name":"DJ MAMBO","time":"22:30"},{"name":"LATINO HEAT","time":"00:30"}]'
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '33333333-3333-3333-3333-333333333333',
  'ECLIPSE — House & Deep',
  'Una serata dedicata alle sonorità più profonde della house music. Atmosfera intima, luci calde e un sound dalle radici Chicago fino ai club di Ibiza.',
  '2026-05-03', '23:30',
  'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80',
  '{House,"Deep House"}', 'No dress code', 400, 56,
  '[{"name":"SUNKEN","time":"23:30"},{"name":"REVE","time":"01:30"},{"name":"FLORA B2B MARZ","time":"03:30"}]'
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'VOID — Industrial Techno',
  'VOID è il capitolo più oscuro della stagione di Altromondo. Techno industriale, EBM e noise. Dress code rigoroso: all black.',
  '2026-05-09', '00:00',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  '{Techno}', 'All black preferred', 500, 203,
  '[{"name":"SURGEON","time":"00:00"},{"name":"OBJECT BLUE","time":"02:00"}]'
);

-- Ticket types per tutti gli eventi
insert into public.ticket_types (event_id, label, price, includes_drink, total_quantity, sold_quantity) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Donna', 10.00, true, 200, 134),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Uomo',  15.00, true, 150, 80),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Early Bird', 8.00, true, 30, 20),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Donna', 10.00, true, 300, 41),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Uomo',  15.00, true, 200, 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Donna', 20.00, true, 150, 150),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Uomo',  25.00, true, 150, 150),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Donna', 8.00,  true, 200, 87),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Uomo',  12.00, true, 150, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Donna', 12.00, true, 100, 56),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Uomo',  18.00, true, 80,  0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Early Bird', 10.00, true, 20, 10),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Donna', 15.00, true, 100, 80),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Uomo',  20.00, true, 80,  50);

-- Tavoli
insert into public.tables (event_id, label, capacity, deposit, is_available) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tavolo Standard 4 pax', 4, 60.00, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tavolo VIP 6 pax',      6, 120.00, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tavolo 4 pax',          4, 50.00, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Tavolo VIP 4 pax',      4, 80.00, false);
