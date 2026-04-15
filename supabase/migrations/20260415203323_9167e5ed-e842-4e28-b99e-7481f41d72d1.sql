ALTER TABLE public.noch_plus_members 
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'priority',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS monthly_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;