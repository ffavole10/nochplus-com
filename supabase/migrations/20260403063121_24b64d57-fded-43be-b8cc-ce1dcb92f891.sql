
-- Add new columns to campaigns table
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS stage_status jsonb NOT NULL DEFAULT '{"upload":"not_started","scan":"not_started","deploy":"not_started","price":"not_started","launch":"not_started"}',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS working_days jsonb NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]',
  ADD COLUMN IF NOT EXISTS hrs_per_charger numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS hrs_per_day numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS break_hrs numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS travel_time_min integer NOT NULL DEFAULT 15;

-- campaign_technicians
CREATE TABLE public.campaign_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  home_base_lat numeric,
  home_base_lng numeric,
  home_base_city text NOT NULL DEFAULT '',
  home_base_airport text,
  assigned_regions jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_technicians" ON public.campaign_technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_technicians" ON public.campaign_technicians FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_technicians" ON public.campaign_technicians FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_technicians" ON public.campaign_technicians FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_technicians_updated_at BEFORE UPDATE ON public.campaign_technicians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- campaign_chargers
CREATE TABLE public.campaign_chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  charger_id uuid NOT NULL REFERENCES public.charger_records(id),
  technician_id uuid REFERENCES public.technicians(id),
  priority text NOT NULL DEFAULT 'low',
  in_scope boolean NOT NULL DEFAULT true,
  sequence_order integer,
  estimated_hours numeric,
  status text NOT NULL DEFAULT 'pending',
  scan_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_chargers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_chargers" ON public.campaign_chargers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_chargers" ON public.campaign_chargers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_chargers" ON public.campaign_chargers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_chargers" ON public.campaign_chargers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_chargers_updated_at BEFORE UPDATE ON public.campaign_chargers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- campaign_schedule
CREATE TABLE public.campaign_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  schedule_date date NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  day_type text NOT NULL DEFAULT 'work',
  sites jsonb NOT NULL DEFAULT '[]',
  travel_segments jsonb NOT NULL DEFAULT '[]',
  overnight_city text,
  total_work_hours numeric NOT NULL DEFAULT 0,
  total_travel_hours numeric NOT NULL DEFAULT 0,
  total_drive_miles numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_schedule" ON public.campaign_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_schedule" ON public.campaign_schedule FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_schedule" ON public.campaign_schedule FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_schedule" ON public.campaign_schedule FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_schedule_updated_at BEFORE UPDATE ON public.campaign_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- campaign_cost_assumptions
CREATE TABLE public.campaign_cost_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  base_labor_rate numeric NOT NULL DEFAULT 145,
  overtime_rate numeric NOT NULL DEFAULT 175,
  portal_to_portal_rate numeric NOT NULL DEFAULT 145,
  overtime_daily_threshold numeric NOT NULL DEFAULT 8,
  overtime_weekly_threshold numeric NOT NULL DEFAULT 40,
  hotel_nightly_rate numeric NOT NULL DEFAULT 175,
  hotel_tax_pct numeric NOT NULL DEFAULT 13,
  meal_per_diem numeric NOT NULL DEFAULT 50,
  ev_rental_daily numeric NOT NULL DEFAULT 150,
  luggage_per_flight numeric NOT NULL DEFAULT 50,
  airfare_buffer_pct numeric NOT NULL DEFAULT 25,
  rate_source text NOT NULL DEFAULT 'default',
  rate_card_id uuid REFERENCES public.rate_cards(id),
  custom_overrides jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_cost_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_cost_assumptions" ON public.campaign_cost_assumptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_cost_assumptions" ON public.campaign_cost_assumptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_cost_assumptions" ON public.campaign_cost_assumptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_cost_assumptions" ON public.campaign_cost_assumptions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_cost_assumptions_updated_at BEFORE UPDATE ON public.campaign_cost_assumptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add campaign_id to existing campaign_quotes table
ALTER TABLE public.campaign_quotes
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_manually_adjusted boolean NOT NULL DEFAULT false;
