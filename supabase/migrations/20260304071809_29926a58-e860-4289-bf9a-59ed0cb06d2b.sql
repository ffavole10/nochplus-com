
-- Create customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  ticket_count integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  last_service_date date,
  status text NOT NULL DEFAULT 'active',
  pricing_type text NOT NULL DEFAULT 'rate_card',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can read customers" ON public.customers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update customers" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete customers" ON public.customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- updated_at trigger
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.customers (company, contact_name, email, phone, address, notes, ticket_count, total_revenue, last_service_date, status, pricing_type) VALUES
  ('ChargePoint Inc.', 'Sarah Chen', 'sarah.chen@chargepoint.com', '(415) 555-0101', '240 E Hacienda Ave, Campbell, CA 95008', 'Premium partner. Quarterly maintenance.', 34, 127500, '2025-01-15', 'active', 'rate_card'),
  ('EVgo Services', 'Marcus Johnson', 'mjohnson@evgo.com', '(213) 555-0202', '11835 W Olympic Blvd, Los Angeles, CA 90064', 'West coast fleet.', 28, 98200, '2025-02-01', 'active', 'rate_card'),
  ('Electrify America', 'Lisa Park', 'lpark@ea.com', '(703) 555-0303', '1950 Opportunity Way, Reston, VA 20190', '', 19, 72000, '2025-01-28', 'active', 'rate_card'),
  ('Blink Charging', 'David Torres', 'dtorres@blinkcharging.com', '(305) 555-0404', '605 Lincoln Rd, Miami Beach, FL 33139', 'Expanding network Q2 2025.', 12, 45800, '2024-12-20', 'active', 'rate_card'),
  ('FreeWire Technologies', 'Amy Nguyen', 'anguyen@freewire.com', '(510) 555-0505', '1933 Davis St, San Leandro, CA 94577', 'Battery-integrated chargers. Special handling.', 8, 31200, '2024-11-15', 'active', 'rate_card'),
  ('SemaConnect', 'Robert Kim', 'rkim@semaconnect.com', '(301) 555-0606', '4961 Tesla Dr, Bowie, MD 20715', '', 3, 9800, '2024-09-30', 'inactive', 'rate_card'),
  ('Volta Charging', 'Jessica Rivera', 'jrivera@voltacharging.com', '(415) 555-0707', '155 De Haro St, San Francisco, CA 94103', 'Media display chargers — handle screens carefully.', 15, 56700, '2025-01-10', 'active', 'rate_card'),
  ('EV Connect', 'Mike Thompson', 'mthompson@evconnect.com', '(310) 555-0808', '900 Wilshire Blvd, Los Angeles, CA 90017', 'Scope-based pricing contract. Rate sheet active.', 22, 89400, '2025-02-10', 'active', 'rate_sheet');
