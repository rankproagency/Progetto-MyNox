-- Aggiunge coordinate geografiche alla tabella clubs
-- Popolate automaticamente dal dashboard (ClubSettingsForm) via Nominatim
-- quando il club admin salva il proprio indirizzo

alter table public.clubs
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;
