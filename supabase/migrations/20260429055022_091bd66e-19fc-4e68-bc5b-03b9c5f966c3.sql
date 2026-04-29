-- Create customer_type enum
DO $$ BEGIN
  CREATE TYPE public.customer_type AS ENUM ('cpo', 'cms', 'oem', 'site_host', 'fleet_operator', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_type public.customer_type,
  ADD COLUMN IF NOT EXISTS customer_type_other text;

-- Backfill from existing industry values where possible
UPDATE public.customers SET customer_type = 'cpo'
  WHERE customer_type IS NULL AND lower(trim(industry)) IN ('cpo', 'charge point operator');

UPDATE public.customers SET customer_type = 'cms'
  WHERE customer_type IS NULL AND lower(trim(industry)) IN ('cms', 'csms', 'charging management software', 'charging station management');

UPDATE public.customers SET customer_type = 'oem'
  WHERE customer_type IS NULL AND lower(trim(industry)) IN ('oem', 'original equipment manufacturer');

UPDATE public.customers SET customer_type = 'site_host'
  WHERE customer_type IS NULL AND lower(trim(industry)) IN ('site host', 'host');

UPDATE public.customers SET customer_type = 'fleet_operator'
  WHERE customer_type IS NULL AND lower(trim(industry)) IN ('fleet', 'fleet operator', 'fleet operations');

COMMENT ON COLUMN public.customers.industry IS 'DEPRECATED — use customer_type. Slated for removal in 30-day follow-up migration.';