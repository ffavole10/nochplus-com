
-- Create charger_locations table for auto-suggest descriptors
CREATE TABLE public.charger_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  descriptor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, descriptor)
);

-- Enable RLS
ALTER TABLE public.charger_locations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can insert charger_locations"
  ON public.charger_locations FOR INSERT
  WITH CHECK (true);

-- Staff can read
CREATE POLICY "Staff can read charger_locations"
  ON public.charger_locations FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'employee'::app_role)
  );

-- Add location_descriptor to assessment_chargers
ALTER TABLE public.assessment_chargers ADD COLUMN IF NOT EXISTS location_descriptor TEXT;

-- Add location_descriptor to ticket_chargers
ALTER TABLE public.ticket_chargers ADD COLUMN IF NOT EXISTS location_descriptor TEXT;
