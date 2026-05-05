
ALTER TABLE public.strategy_kpi_actuals
  ADD COLUMN IF NOT EXISTS delta_value numeric,
  ADD COLUMN IF NOT EXISTS week_starting date,
  ADD COLUMN IF NOT EXISTS entered_in_weekly_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_review_id uuid REFERENCES public.weekly_reviews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_strategy_kpi_actuals_week ON public.strategy_kpi_actuals(strategy_kpi_id, week_starting);
CREATE INDEX IF NOT EXISTS idx_strategy_kpi_actuals_review ON public.strategy_kpi_actuals(weekly_review_id);
