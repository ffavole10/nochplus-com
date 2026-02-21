
-- OEM table
CREATE TABLE public.swi_oems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.swi_oems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read OEMs" ON public.swi_oems FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert OEMs" ON public.swi_oems FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update OEMs" ON public.swi_oems FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete OEMs" ON public.swi_oems FOR DELETE USING (auth.uid() IS NOT NULL);

-- SWI catalog entries table
CREATE TABLE public.swi_catalog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oem_id uuid NOT NULL REFERENCES public.swi_oems(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'General',
  title text NOT NULL,
  filename text NOT NULL,
  description text DEFAULT '',
  charger_models text[] DEFAULT '{}',
  issue_types text[] DEFAULT '{}',
  service_categories text[] DEFAULT '{}',
  priority text[] DEFAULT '{}',
  estimated_time text DEFAULT '',
  required_parts text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.swi_catalog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read SWI entries" ON public.swi_catalog_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert SWI entries" ON public.swi_catalog_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update SWI entries" ON public.swi_catalog_entries FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete SWI entries" ON public.swi_catalog_entries FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed BTC Power as default OEM
INSERT INTO public.swi_oems (name, sort_order) VALUES ('BTC Power', 0);
