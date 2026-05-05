CREATE TABLE IF NOT EXISTS public.qbr_monthly_breakdown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qbr_id UUID NOT NULL REFERENCES public.quarterly_reviews(id) ON DELETE CASCADE,
  month_index INT NOT NULL CHECK (month_index BETWEEN 1 AND 3),
  month_label TEXT NOT NULL,
  revenue NUMERIC,
  net_income NUMERIC,
  annotation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (qbr_id, month_index)
);

ALTER TABLE public.qbr_monthly_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view qbr monthly breakdown"
  ON public.qbr_monthly_breakdown FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert qbr monthly breakdown"
  ON public.qbr_monthly_breakdown FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update qbr monthly breakdown"
  ON public.qbr_monthly_breakdown FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete qbr monthly breakdown"
  ON public.qbr_monthly_breakdown FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_qbr_monthly_breakdown_updated_at
  BEFORE UPDATE ON public.qbr_monthly_breakdown
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Q1 2026 monthly data for the existing QBR
INSERT INTO public.qbr_monthly_breakdown (qbr_id, month_index, month_label, revenue, net_income, annotation)
SELECT id, 1, 'January', 26994, -56652, 'Operational coverage scaling' FROM public.quarterly_reviews WHERE quarter='Q1' AND year=2026
ON CONFLICT (qbr_id, month_index) DO NOTHING;
INSERT INTO public.qbr_monthly_breakdown (qbr_id, month_index, month_label, revenue, net_income, annotation)
SELECT id, 2, 'February', 41890, -54649, 'Invoicing process transition' FROM public.quarterly_reviews WHERE quarter='Q1' AND year=2026
ON CONFLICT (qbr_id, month_index) DO NOTHING;
INSERT INTO public.qbr_monthly_breakdown (qbr_id, month_index, month_label, revenue, net_income, annotation)
SELECT id, 3, 'March', 263098, 125954, 'Backlog cleared + daily invoicing live' FROM public.quarterly_reviews WHERE quarter='Q1' AND year=2026
ON CONFLICT (qbr_id, month_index) DO NOTHING;