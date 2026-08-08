alter table tables
  add column if not exists zone_label text,
  add column if not exists zone_color text,
  add column if not exists minimum_spend numeric;
