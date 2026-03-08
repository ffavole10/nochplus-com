
ALTER TABLE public.noch_plus_submissions ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);
ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);
