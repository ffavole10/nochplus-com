-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  customer TEXT NOT NULL,
  quarter TEXT,
  year INTEGER,
  start_date DATE,
  end_date DATE,
  total_chargers INTEGER DEFAULT 0,
  total_serviced INTEGER DEFAULT 0,
  optimal_count INTEGER DEFAULT 0,
  degraded_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  health_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create charger_records table for individual charger data
CREATE TABLE public.charger_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_name TEXT,
  serial_number TEXT,
  model TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  start_date DATE,
  max_power INTEGER,
  site_name TEXT,
  serviced_qty INTEGER DEFAULT 0,
  service_date DATE,
  report_url TEXT,
  status TEXT CHECK (status IN ('Optimal', 'Degraded', 'Critical')),
  summary TEXT,
  power_cabinet_report_url TEXT,
  power_cabinet_status TEXT,
  power_cabinet_summary TEXT,
  service_required INTEGER DEFAULT 0,
  ccs_cable_issue BOOLEAN DEFAULT false,
  chademo_cable_issue BOOLEAN DEFAULT false,
  screen_damage BOOLEAN DEFAULT false,
  cc_reader_issue BOOLEAN DEFAULT false,
  rfid_reader_issue BOOLEAN DEFAULT false,
  app_issue BOOLEAN DEFAULT false,
  holster_issue BOOLEAN DEFAULT false,
  other_issue BOOLEAN DEFAULT false,
  power_supply_issue BOOLEAN DEFAULT false,
  circuit_board_issue BOOLEAN DEFAULT false,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public read for now, will add auth later)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charger_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (will be restricted with auth later)
CREATE POLICY "Allow public read access on campaigns" 
ON public.campaigns 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on campaigns" 
ON public.campaigns 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access on charger_records" 
ON public.charger_records 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on charger_records" 
ON public.charger_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on charger_records" 
ON public.charger_records 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on charger_records" 
ON public.charger_records 
FOR DELETE 
USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_charger_records_campaign_id ON public.charger_records(campaign_id);
CREATE INDEX idx_charger_records_status ON public.charger_records(status);
CREATE INDEX idx_campaigns_customer ON public.campaigns(customer);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();