
-- 1. Focus columns on account_strategies
ALTER TABLE public.account_strategies
  ADD COLUMN IF NOT EXISTS is_focus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS focus_quarter text,
  ADD COLUMN IF NOT EXISTS focus_reason text,
  ADD COLUMN IF NOT EXISTS focus_added_at timestamptz,
  ADD COLUMN IF NOT EXISTS focus_added_by text;

CREATE INDEX IF NOT EXISTS idx_account_strategies_is_focus
  ON public.account_strategies (is_focus) WHERE is_focus = true;

-- 2. focus_history table
CREATE TABLE IF NOT EXISTS public.focus_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.account_strategies(id) ON DELETE CASCADE,
  customer_id uuid,
  focus_quarter text NOT NULL,
  focus_reason text,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  added_by text,
  removed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_history_strategy ON public.focus_history (strategy_id);
CREATE INDEX IF NOT EXISTS idx_focus_history_quarter ON public.focus_history (focus_quarter);

ALTER TABLE public.focus_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read focus history" ON public.focus_history;
CREATE POLICY "Authenticated users can read focus history"
  ON public.focus_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Privileged users can write focus history" ON public.focus_history;
CREATE POLICY "Privileged users can write focus history"
  ON public.focus_history FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'account_manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'account_manager'::app_role)
  );

-- 3. Trigger: max 5 Focus strategies
CREATE OR REPLACE FUNCTION public.enforce_focus_5_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF NEW.is_focus = true AND (TG_OP = 'INSERT' OR OLD.is_focus = false) THEN
    SELECT count(*) INTO current_count
    FROM public.account_strategies
    WHERE is_focus = true AND id <> NEW.id;
    IF current_count >= 5 THEN
      RAISE EXCEPTION 'Focus 5 limit reached: you already have 5 Focus accounts. Remove one first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_focus_5_limit ON public.account_strategies;
CREATE TRIGGER trg_enforce_focus_5_limit
  BEFORE INSERT OR UPDATE OF is_focus ON public.account_strategies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_focus_5_limit();

-- 4. Focus Mode preference on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS focus_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS focus_mode_quarter text;
