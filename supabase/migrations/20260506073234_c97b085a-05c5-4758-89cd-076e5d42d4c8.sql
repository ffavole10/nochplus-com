ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS geocoded_lat numeric,
  ADD COLUMN IF NOT EXISTS geocoded_lng numeric,
  ADD COLUMN IF NOT EXISTS location_override_lat numeric,
  ADD COLUMN IF NOT EXISTS location_override_lng numeric,
  ADD COLUMN IF NOT EXISTS geocoding_confidence text,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;