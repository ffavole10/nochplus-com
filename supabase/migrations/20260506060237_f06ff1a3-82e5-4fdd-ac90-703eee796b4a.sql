ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS list_monthly_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negotiated_monthly_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS annual_prepay_amount numeric,
  ADD COLUMN IF NOT EXISTS annual_savings numeric,
  ADD COLUMN IF NOT EXISTS annual_period_end timestamptz;

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_billing_cycle_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_billing_cycle_check
  CHECK (billing_cycle IN ('monthly','annual_prepay'));

ALTER TABLE public.membership_enrollment_history
  ADD COLUMN IF NOT EXISTS list_monthly_revenue numeric,
  ADD COLUMN IF NOT EXISTS negotiated_monthly_revenue numeric,
  ADD COLUMN IF NOT EXISTS discount_pct numeric,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS annual_prepay_amount numeric,
  ADD COLUMN IF NOT EXISTS annual_period_end timestamptz;
