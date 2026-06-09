-- STEP 1: trova il ticket e l'extra "ballerine"
SELECT
  t.id AS ticket_id,
  t.table_id,
  t.extras,
  ee.id AS extra_id,
  ee.label,
  ee.available_stock
FROM tickets t
CROSS JOIN event_extras ee
WHERE t.table_name = 'VEGG'
  AND t.status IN ('valid', 'used')
  AND ee.label ILIKE '%ballerina%' OR ee.label ILIKE '%dancer%' OR ee.label ILIKE '%ballerine%'
ORDER BY t.created_at DESC
LIMIT 5;
