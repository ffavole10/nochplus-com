
-- Create estimates table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  charger_record_id UUID REFERENCES public.charger_records(id) ON DELETE SET NULL,
  ticket_id TEXT,
  station_id TEXT,
  site_name TEXT,
  customer_email TEXT,
  account_manager TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0.08,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access on estimates" ON public.estimates FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on estimates" ON public.estimates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on estimates" ON public.estimates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on estimates" ON public.estimates FOR DELETE USING (true);

-- Timestamp trigger
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
