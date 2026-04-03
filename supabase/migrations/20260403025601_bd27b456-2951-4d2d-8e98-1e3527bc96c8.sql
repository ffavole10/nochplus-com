
-- 1. campaign_plans
CREATE TABLE public.campaign_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  deadline date,
  working_days jsonb NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]',
  hrs_per_charger numeric NOT NULL DEFAULT 2,
  hrs_per_day numeric NOT NULL DEFAULT 8,
  break_hrs numeric NOT NULL DEFAULT 1,
  travel_time_min integer NOT NULL DEFAULT 15,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_plans" ON public.campaign_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_plans" ON public.campaign_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_plans" ON public.campaign_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_plans" ON public.campaign_plans FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_plans_updated_at BEFORE UPDATE ON public.campaign_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. campaign_plan_technicians
CREATE TABLE public.campaign_plan_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.campaign_plans(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE CASCADE NOT NULL,
  home_base_lat numeric,
  home_base_lng numeric,
  home_base_city text NOT NULL DEFAULT '',
  assigned_regions jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_plan_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_plan_technicians" ON public.campaign_plan_technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_plan_technicians" ON public.campaign_plan_technicians FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_plan_technicians" ON public.campaign_plan_technicians FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_plan_technicians" ON public.campaign_plan_technicians FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_plan_technicians_updated_at BEFORE UPDATE ON public.campaign_plan_technicians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. campaign_plan_chargers
CREATE TABLE public.campaign_plan_chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.campaign_plans(id) ON DELETE CASCADE NOT NULL,
  charger_id uuid REFERENCES public.charger_records(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  sequence_order integer,
  priority text NOT NULL DEFAULT 'medium',
  estimated_hours numeric NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_plan_chargers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_plan_chargers" ON public.campaign_plan_chargers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_plan_chargers" ON public.campaign_plan_chargers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_plan_chargers" ON public.campaign_plan_chargers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_plan_chargers" ON public.campaign_plan_chargers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_plan_chargers_updated_at BEFORE UPDATE ON public.campaign_plan_chargers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. campaign_plan_schedule
CREATE TABLE public.campaign_plan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.campaign_plans(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE CASCADE NOT NULL,
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

ALTER TABLE public.campaign_plan_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_plan_schedule" ON public.campaign_plan_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_plan_schedule" ON public.campaign_plan_schedule FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_plan_schedule" ON public.campaign_plan_schedule FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_plan_schedule" ON public.campaign_plan_schedule FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_plan_schedule_updated_at BEFORE UPDATE ON public.campaign_plan_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. campaign_quotes
CREATE TABLE public.campaign_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.campaign_plans(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  quote_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  valid_until date,
  rate_card_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_quotes" ON public.campaign_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_quotes" ON public.campaign_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_quotes" ON public.campaign_quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_quotes" ON public.campaign_quotes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_quotes_updated_at BEFORE UPDATE ON public.campaign_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. campaign_quote_line_items
CREATE TABLE public.campaign_quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.campaign_quotes(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select campaign_quote_line_items" ON public.campaign_quote_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert campaign_quote_line_items" ON public.campaign_quote_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update campaign_quote_line_items" ON public.campaign_quote_line_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete campaign_quote_line_items" ON public.campaign_quote_line_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_campaign_quote_line_items_updated_at BEFORE UPDATE ON public.campaign_quote_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
