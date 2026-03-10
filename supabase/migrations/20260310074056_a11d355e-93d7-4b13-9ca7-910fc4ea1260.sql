
-- Drop the overly restrictive unique constraint that prevents child tickets
DROP INDEX IF EXISTS idx_no_duplicate_tickets;

-- Recreate it to only apply to parent tickets (is_parent = true)
CREATE UNIQUE INDEX idx_no_duplicate_tickets 
ON public.service_tickets (submission_id, source) 
WHERE status NOT IN ('cancelled', 'closed') 
  AND submission_id IS NOT NULL 
  AND (is_parent = true OR parent_ticket_id IS NULL);

-- Clean up: delete orphaned parent ticket and reset submission
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
