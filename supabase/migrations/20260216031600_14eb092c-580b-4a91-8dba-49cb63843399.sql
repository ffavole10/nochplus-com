
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'CPOs',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert partners" ON public.partners FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update partners" ON public.partners FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete partners" ON public.partners FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed default partners
INSERT INTO public.partners (value, label, category, sort_order) VALUES
  ('evgo', 'EVgo', 'CPOs', 1),
  ('chargepoint', 'ChargePoint', 'CPOs', 2),
  ('electrify_america', 'Electrify America', 'CPOs', 3),
  ('blink_charging', 'Blink Charging', 'CPOs', 4),
  ('shell_recharge', 'Shell Recharge', 'CPOs', 5),
  ('btc_power', 'BTC Power', 'OEMs', 10),
  ('abb', 'ABB', 'OEMs', 11),
  ('delta_electronics', 'Delta Electronics', 'OEMs', 12),
  ('tritium', 'Tritium', 'OEMs', 13),
  ('signet', 'Signet', 'OEMs', 14),
  ('chargelab', 'ChargeLab', 'CSMS', 20),
  ('driivz', 'Driivz', 'CSMS', 21),
  ('greenlots', 'Greenlots', 'CSMS', 22),
  ('sitehost', 'SiteHost', 'CSMS', 23),
  ('open_charge_cloud', 'Open Charge Cloud', 'CSMS', 24);
