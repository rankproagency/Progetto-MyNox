-- =============================================
-- MYNOX — Posizioni tavoli sulla piantina
-- Incolla nel SQL Editor di Supabase
-- =============================================

alter table public.tables
  add column if not exists pos_x float,
  add column if not exists pos_y float;
