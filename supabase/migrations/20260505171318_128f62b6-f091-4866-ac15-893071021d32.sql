
-- Audit log for KPI quarter unlock events and edits-while-unlocked
CREATE TABLE public.strategy_kpi_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  kpi_id uuid NOT NULL,
  quarter text NOT NULL,
  action text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategy_kpi_audit_kpi ON public.strategy_kpi_audit_log(kpi_id, created_at DESC);

ALTER TABLE public.strategy_kpi_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view and insert audit entries (read-only history; surfaced in admin view later)
CREATE POLICY "Authenticated users can view kpi audit log"
ON public.strategy_kpi_audit_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert kpi audit log"
ON public.strategy_kpi_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
