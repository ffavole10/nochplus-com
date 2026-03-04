
-- Create customer_rate_sheets table
CREATE TABLE public.customer_rate_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  effective_date date,
  expiration_date date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_rate_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read customer_rate_sheets" ON public.customer_rate_sheets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert customer_rate_sheets" ON public.customer_rate_sheets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update customer_rate_sheets" ON public.customer_rate_sheets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete customer_rate_sheets" ON public.customer_rate_sheets FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_customer_rate_sheets_updated_at BEFORE UPDATE ON public.customer_rate_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create rate_sheet_scopes table
CREATE TABLE public.rate_sheet_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_sheet_id uuid NOT NULL REFERENCES public.customer_rate_sheets(id) ON DELETE CASCADE,
  scope_code text NOT NULL,
  scope_name text NOT NULL,
  exhibit text NOT NULL DEFAULT 'A',
  hours_to_complete numeric,
  price_24hr numeric,
  price_48hr numeric,
  price_72hr numeric,
  price_96hr numeric,
  price_192hr numeric,
  travel_note text DEFAULT '',
  requires_ev_rental boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_sheet_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate_sheet_scopes" ON public.rate_sheet_scopes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_sheet_scopes" ON public.rate_sheet_scopes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_sheet_scopes" ON public.rate_sheet_scopes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_sheet_scopes" ON public.rate_sheet_scopes FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create rate_sheet_travel_fees table
CREATE TABLE public.rate_sheet_travel_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_sheet_id uuid NOT NULL REFERENCES public.customer_rate_sheets(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  label text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'flat',
  threshold numeric,
  notes text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_sheet_travel_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create rate_sheet_volume_discounts table
CREATE TABLE public.rate_sheet_volume_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_sheet_id uuid NOT NULL REFERENCES public.customer_rate_sheets(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'service',
  min_stations int NOT NULL DEFAULT 1,
  max_stations int,
  discount_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_sheet_volume_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR DELETE USING (auth.uid() IS NOT NULL);
