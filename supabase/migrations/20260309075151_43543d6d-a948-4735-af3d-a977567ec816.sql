-- Persist per-charger service request selection for assessment submissions
ALTER TABLE public.assessment_chargers
ADD COLUMN IF NOT EXISTS service_needed boolean;