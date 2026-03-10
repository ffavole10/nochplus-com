
DELETE FROM ticket_chargers WHERE ticket_id IN (
  SELECT id FROM service_tickets WHERE submission_id IN (
    SELECT id FROM noch_plus_submissions WHERE submission_id = 'NP-2026-D2804046'
  )
);
DELETE FROM service_tickets WHERE submission_id IN (
  SELECT id FROM noch_plus_submissions WHERE submission_id = 'NP-2026-D2804046'
);
UPDATE noch_plus_submissions 
SET tickets_created = false, tickets_created_at = NULL, updated_at = now() 
WHERE submission_id = 'NP-2026-D2804046';
