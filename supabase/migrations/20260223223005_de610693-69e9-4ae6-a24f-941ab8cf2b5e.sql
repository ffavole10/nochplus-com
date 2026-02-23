
-- Add per-charger status, service_needed, and notes columns
ALTER TABLE public.charger_submissions
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS service_needed boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS staff_notes text DEFAULT NULL;
