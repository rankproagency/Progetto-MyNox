-- Add province column to clubs table
-- Province is used in the app to filter events by area (e.g. a club in Vigonza
-- has city='Vigonza' and province='Padova', so it appears under Padova in the app)

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS province text;
