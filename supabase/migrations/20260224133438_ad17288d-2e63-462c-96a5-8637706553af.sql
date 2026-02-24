
-- Technicians table
CREATE TABLE public.technicians (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  photo_url text,
  employee_type text NOT NULL DEFAULT 'employee',
  level text NOT NULL DEFAULT 'level_1',
  hourly_rate numeric NOT NULL DEFAULT 150,
  travel_rate numeric NOT NULL DEFAULT 75,
  status text NOT NULL DEFAULT 'available',
  active boolean NOT NULL DEFAULT true,
  home_base_city text NOT NULL DEFAULT '',
  home_base_state text NOT NULL DEFAULT '',
  home_base_lat numeric,
  home_base_lng numeric,
  coverage_radius_miles integer NOT NULL DEFAULT 120,
  service_regions text[] DEFAULT '{}'::text[],
  charger_types text[] DEFAULT '{"AC | Level 2"}'::text[],
  work_schedule jsonb NOT NULL DEFAULT '{"monday":{"start":"08:00","end":"17:00"},"tuesday":{"start":"08:00","end":"17:00"},"wednesday":{"start":"08:00","end":"17:00"},"thursday":{"start":"08:00","end":"17:00"},"friday":{"start":"08:00","end":"17:00"}}'::jsonb,
  max_jobs_per_day integer NOT NULL DEFAULT 3,
  active_jobs_count integer NOT NULL DEFAULT 0,
  preferred_contact text NOT NULL DEFAULT 'phone',
  company_name text,
  contract_terms text,
  payment_terms text,
  insurance_expiration date,
  jobs_completed_30d integer NOT NULL DEFAULT 0,
  hours_logged_30d numeric NOT NULL DEFAULT 0,
  revenue_generated_30d numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read technicians" ON public.technicians FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert technicians" ON public.technicians FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update technicians" ON public.technicians FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete technicians" ON public.technicians FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service regions table
CREATE TABLE public.service_regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  cities text[] DEFAULT '{}'::text[],
  technician_ids uuid[] DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_regions" ON public.service_regions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert service_regions" ON public.service_regions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update service_regions" ON public.service_regions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete service_regions" ON public.service_regions FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_service_regions_updated_at BEFORE UPDATE ON public.service_regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
