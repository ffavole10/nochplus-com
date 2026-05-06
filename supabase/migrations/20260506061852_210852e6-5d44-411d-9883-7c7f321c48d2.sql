-- Multi-line charger configuration for NOCH+ memberships
CREATE TABLE IF NOT EXISTS public.membership_charger_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  charger_type text NOT NULL CHECK (charger_type IN ('ac_level_2','dc_level_3','ac_level_1')),
  connector_count integer NOT NULL CHECK (connector_count >= 1),
  tier_rate_per_connector numeric NOT NULL DEFAULT 0,
  negotiated_rate_per_connector numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcl_account ON public.membership_charger_lines(account_id);

ALTER TABLE public.membership_charger_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view charger lines"
  ON public.membership_charger_lines FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert charger lines"
  ON public.membership_charger_lines FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update charger lines"
  ON public.membership_charger_lines FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete charger lines"
  ON public.membership_charger_lines FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_membership_charger_lines_updated_at
  BEFORE UPDATE ON public.membership_charger_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing single-type enrollments into a line each
INSERT INTO public.membership_charger_lines
  (account_id, charger_type, connector_count, tier_rate_per_connector, negotiated_rate_per_connector, sort_order)
SELECT
  c.id,
  'ac_level_2',
  GREATEST(c.chargers_enrolled_count, 1),
  CASE c.membership_tier WHEN 'essential' THEN 10 WHEN 'priority' THEN 15 WHEN 'elite' THEN 20 ELSE 0 END,
  CASE
    WHEN c.chargers_enrolled_count > 0 AND c.negotiated_monthly_revenue IS NOT NULL
      THEN c.negotiated_monthly_revenue / c.chargers_enrolled_count
    ELSE
      CASE c.membership_tier WHEN 'essential' THEN 10 WHEN 'priority' THEN 15 WHEN 'elite' THEN 20 ELSE 0 END
  END,
  0
FROM public.customers c
WHERE c.membership_status IN ('active','paused','demo')
  AND c.chargers_enrolled_count IS NOT NULL
  AND c.chargers_enrolled_count > 0
  AND NOT EXISTS (SELECT 1 FROM public.membership_charger_lines l WHERE l.account_id = c.id);