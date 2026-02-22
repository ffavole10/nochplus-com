
-- Create rate_sheets table for storing customer-specific pricing
CREATE TABLE public.rate_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on rate_sheets" ON public.rate_sheets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on rate_sheets" ON public.rate_sheets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on rate_sheets" ON public.rate_sheets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on rate_sheets" ON public.rate_sheets FOR DELETE USING (true);

-- Create rate_sheet_items table for individual line items/scopes
CREATE TABLE public.rate_sheet_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_sheet_id uuid NOT NULL REFERENCES public.rate_sheets(id) ON DELETE CASCADE,
  scope_code text NOT NULL,
  scope_name text NOT NULL,
  hours numeric,
  rate_24h numeric,
  rate_48h numeric,
  rate_72h numeric,
  rate_96h numeric,
  rate_192h numeric,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on rate_sheet_items" ON public.rate_sheet_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on rate_sheet_items" ON public.rate_sheet_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on rate_sheet_items" ON public.rate_sheet_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on rate_sheet_items" ON public.rate_sheet_items FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_rate_sheets_updated_at
BEFORE UPDATE ON public.rate_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
