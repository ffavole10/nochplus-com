
-- Campaign Field Reports
CREATE TABLE public.campaign_field_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  technician_id UUID REFERENCES public.technicians(id),
  site_name TEXT NOT NULL DEFAULT '',
  charger_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  work_performed TEXT DEFAULT '',
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  hours_logged NUMERIC(5,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  photo_urls TEXT[] DEFAULT '{}',
  is_unscheduled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_field_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage field reports" ON public.campaign_field_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_campaign_field_reports_updated_at
  BEFORE UPDATE ON public.campaign_field_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign Escalations
CREATE TABLE public.campaign_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  site_name TEXT DEFAULT '',
  charger_id TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'warning',
  issue_type TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage escalations" ON public.campaign_escalations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_campaign_escalations_updated_at
  BEFORE UPDATE ON public.campaign_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
