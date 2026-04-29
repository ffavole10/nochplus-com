
-- 1. Extend deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS predicted_close_date date,
  ADD COLUMN IF NOT EXISTS actual_close_date date,
  ADD COLUMN IF NOT EXISTS predicted_arr numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_arr numeric(14,2),
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fit_score integer CHECK (fit_score IS NULL OR (fit_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS model_close_probability integer CHECK (model_close_probability IS NULL OR (model_close_probability BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS deal_health text CHECK (deal_health IS NULL OR deal_health IN ('healthy','at_risk','critical','stalled')),
  ADD COLUMN IF NOT EXISTS loss_reason text CHECK (loss_reason IS NULL OR loss_reason IN ('price','timing','competitor','no_decision','bad_fit','other')),
  ADD COLUMN IF NOT EXISTS competitor text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Add new stage values to deal_stage enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'In Negotiation' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'In Negotiation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Closed Won' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'Closed Won';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Closed Lost' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'Closed Lost';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Engaged' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'Engaged';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Qualified' AND enumtypid = 'public.deal_stage'::regtype) THEN
    ALTER TYPE public.deal_stage ADD VALUE 'Qualified';
  END IF;
END $$;

-- 3. agent_outputs table
CREATE TABLE IF NOT EXISTS public.agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  agent_name text NOT NULL CHECK (agent_name IN ('scribe','closer','forecaster')),
  output_type text NOT NULL CHECK (output_type IN ('brief','proposal_draft','forecast')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_deal ON public.agent_outputs(deal_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent ON public.agent_outputs(agent_name);

ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read agent_outputs"
  ON public.agent_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert agent_outputs"
  ON public.agent_outputs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete agent_outputs"
  ON public.agent_outputs FOR DELETE TO authenticated USING (true);

-- 4. account_ops_snapshot view
CREATE OR REPLACE VIEW public.account_ops_snapshot AS
SELECT
  c.id AS customer_id,
  COALESCE(loc_agg.charger_count, 0)::int AS charger_count,
  COALESCE(loc_agg.sites_count, 0)::int AS sites_count,
  COALESCE(t30.incidents_30d, 0)::int AS incidents_30d,
  CASE
    WHEN COALESCE(loc_agg.charger_count, 0) = 0 THEN 100.0
    ELSE GREATEST(0, 100.0 - (COALESCE(t30.incidents_30d, 0)::numeric / GREATEST(loc_agg.charger_count, 1) * 5))
  END AS uptime_pct,
  COALESCE(t30.incidents_30d, 0)::int AS truck_rolls_30d,
  (COALESCE(t30.incidents_30d, 0) * 850 * 0.5)::numeric AS estimated_monthly_savings
FROM public.customers c
LEFT JOIN (
  SELECT customer_id,
         COUNT(*) AS sites_count,
         SUM(charger_count) AS charger_count
  FROM public.locations
  GROUP BY customer_id
) loc_agg ON loc_agg.customer_id = c.id
LEFT JOIN (
  SELECT company_id AS customer_id, COUNT(*) AS incidents_30d
  FROM public.service_tickets
  WHERE created_at >= now() - interval '30 days'
    AND company_id IS NOT NULL
  GROUP BY company_id
) t30 ON t30.customer_id = c.id;

GRANT SELECT ON public.account_ops_snapshot TO authenticated, anon;
