
-- Delete orphaned ticket_chargers for the bad parent ticket
DELETE FROM ticket_chargers WHERE ticket_id IN (
  SELECT id FROM service_tickets WHERE submission_id IN (
    SELECT id FROM noch_plus_submissions WHERE submission_id = 'NP-2026-D2804046'
  )
);

-- Delete the bad service tickets
DELETE FROM service_tickets WHERE submission_id IN (
  SELECT id FROM noch_plus_submissions WHERE submission_id = 'NP-2026-D2804046'
);

-- Reset the submission flag
UPDATE noch_plus_submissions 
SET tickets_created = false, tickets_created_at = NULL, updated_at = now() 
WHERE submission_id = 'NP-2026-D2804046';
