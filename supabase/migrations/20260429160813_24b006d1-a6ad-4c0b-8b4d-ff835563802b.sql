-- 1. Soft delete column on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);

-- 2. Extend contacts table
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS notes text;

-- Constrain contact_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_type_check'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_contact_type_check
      CHECK (contact_type IN ('primary','decision_maker','technical','billing','operations','other'));
  END IF;
END $$;

-- Enforce only one primary contact per customer
CREATE UNIQUE INDEX IF NOT EXISTS uniq_contacts_primary_per_customer
  ON public.contacts(customer_id)
  WHERE is_primary = true;

-- 3. Activity log table
CREATE TABLE IF NOT EXISTS public.account_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  actor text,
  actor_user_id uuid,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_activity_log_customer ON public.account_activity_log(customer_id, created_at DESC);

ALTER TABLE public.account_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view activity log" ON public.account_activity_log;
CREATE POLICY "Authenticated users can view activity log"
  ON public.account_activity_log
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.account_activity_log;
CREATE POLICY "Authenticated users can insert activity log"
  ON public.account_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
