
DO $$ BEGIN
  CREATE TYPE public.deal_type AS ENUM ('recurring', 'one_time', 'hybrid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_model AS ENUM ('per_connector', 'flat_monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_type public.deal_type NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS recurring_model public.recurring_model,
  ADD COLUMN IF NOT EXISTS connector_count integer,
  ADD COLUMN IF NOT EXISTS monthly_rate numeric,
  ADD COLUMN IF NOT EXISTS contract_length_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS one_time_value numeric,
  ADD COLUMN IF NOT EXISTS one_time_description text;
