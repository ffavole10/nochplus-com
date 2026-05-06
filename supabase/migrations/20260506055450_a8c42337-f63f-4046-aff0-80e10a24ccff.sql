-- Account-level membership enrollment fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS membership_tier text,
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'not_enrolled',
  ADD COLUMN IF NOT EXISTS enrolled_at timestamptz,
  ADD COLUMN IF NOT EXISTS chargers_enrolled_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_demo_membership boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_notes text;

-- Validation: membership_status must be one of the known values
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_membership_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_membership_status_check
  CHECK (membership_status IN ('not_enrolled','active','paused','cancelled','demo'));

-- Validation: membership_tier (text, references known tier names)
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_membership_tier_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_membership_tier_check
  CHECK (membership_tier IS NULL OR membership_tier IN ('starter','essential','priority','elite','enterprise'));

-- Enrollment history (audit log)
CREATE TABLE IF NOT EXISTS public.membership_enrollment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tier text,
  action text NOT NULL CHECK (action IN ('enrolled','upgraded','downgraded','paused','reactivated','cancelled','tier_changed')),
  reason text,
  chargers_count integer,
  monthly_revenue numeric,
  is_demo boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meh_account ON public.membership_enrollment_history(account_id, created_at DESC);

ALTER TABLE public.membership_enrollment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view enrollment history" ON public.membership_enrollment_history;
CREATE POLICY "Authenticated can view enrollment history"
  ON public.membership_enrollment_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert enrollment history" ON public.membership_enrollment_history;
CREATE POLICY "Authenticated can insert enrollment history"
  ON public.membership_enrollment_history FOR INSERT
  TO authenticated WITH CHECK (true);
