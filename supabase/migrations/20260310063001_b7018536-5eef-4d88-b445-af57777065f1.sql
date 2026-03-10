
-- Add columns to service_tickets for parent/child and submission tracking
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS submission_id uuid,
  ADD COLUMN IF NOT EXISTS parent_ticket_id uuid REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_parent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS charger_count integer DEFAULT 1;

-- Add tickets_created tracking to noch_plus_submissions
ALTER TABLE public.noch_plus_submissions
  ADD COLUMN IF NOT EXISTS tickets_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tickets_created_at timestamptz;

-- Unique index to prevent duplicate tickets per submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_duplicate_tickets
  ON public.service_tickets (submission_id, source)
  WHERE status NOT IN ('cancelled', 'closed')
    AND submission_id IS NOT NULL;
