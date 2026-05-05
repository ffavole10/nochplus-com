
-- Add phased target support to strategy_kpis
DO $$ BEGIN
  CREATE TYPE public.strategy_kpi_target_type AS ENUM ('single', 'phased');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.strategy_kpis
  ADD COLUMN IF NOT EXISTS target_type public.strategy_kpi_target_type NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS annual_target_value numeric,
  ADD COLUMN IF NOT EXISTS quarter_phasing jsonb;

-- Actuals tracking table
CREATE TABLE IF NOT EXISTS public.strategy_kpi_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_kpi_id uuid NOT NULL REFERENCES public.strategy_kpis(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  year integer NOT NULL,
  actual_value numeric NOT NULL DEFAULT 0,
  entered_by text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_kpi_actuals_kpi ON public.strategy_kpi_actuals(strategy_kpi_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpi_actuals_period ON public.strategy_kpi_actuals(strategy_kpi_id, year, quarter);

ALTER TABLE public.strategy_kpi_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view kpi actuals"
ON public.strategy_kpi_actuals FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated can insert kpi actuals"
ON public.strategy_kpi_actuals FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update kpi actuals"
ON public.strategy_kpi_actuals FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Authenticated can delete kpi actuals"
ON public.strategy_kpi_actuals FOR DELETE
TO authenticated USING (true);
