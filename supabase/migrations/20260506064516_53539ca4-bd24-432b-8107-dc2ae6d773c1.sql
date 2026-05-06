
-- Source tracking on customers (current membership)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS source_submission_id uuid REFERENCES public.noch_plus_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual';

-- Source tracking on history
ALTER TABLE public.membership_enrollment_history
  ADD COLUMN IF NOT EXISTS source_submission_id uuid REFERENCES public.noch_plus_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual';

-- Enrollment flag on submissions
ALTER TABLE public.noch_plus_submissions
  ADD COLUMN IF NOT EXISTS membership_enrolled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_membership_account_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_enrolled_at timestamptz;
