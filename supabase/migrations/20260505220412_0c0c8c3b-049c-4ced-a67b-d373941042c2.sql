
-- Expand loss_reason values & add win_reason / closed_at / loss_reason_notes / win_reason_notes
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_loss_reason_check;
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS loss_reason_notes text,
  ADD COLUMN IF NOT EXISTS win_reason text,
  ADD COLUMN IF NOT EXISTS win_reason_notes text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.deals ADD CONSTRAINT deals_loss_reason_check
  CHECK (loss_reason IS NULL OR loss_reason = ANY (ARRAY[
    'lost_to_competitor','no_budget','timing_not_right','decision_delayed',
    'lost_to_status_quo','champion_left','product_gap','pricing','other',
    -- legacy values kept for backward compatibility
    'price','timing','competitor','no_decision','bad_fit'
  ]));

ALTER TABLE public.deals ADD CONSTRAINT deals_win_reason_check
  CHECK (win_reason IS NULL OR win_reason = ANY (ARRAY[
    'displaced_competitor','new_initiative_funded','champion_drove_internal',
    'timing_aligned','product_fit','pricing_won','other'
  ]));

-- Stage transitions audit table
CREATE TABLE IF NOT EXISTS public.deal_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  transition_type text NOT NULL CHECK (transition_type IN ('forward','backward','closed_won','closed_lost','reopen')),
  reason_code text,
  notes text,
  value_at_transition numeric(14,2),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_stage_transitions_deal ON public.deal_stage_transitions(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_stage_transitions_created ON public.deal_stage_transitions(created_at DESC);

ALTER TABLE public.deal_stage_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transitions"
  ON public.deal_stage_transitions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert transitions"
  ON public.deal_stage_transitions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Immutable: no update/delete policies (no one can modify after insert)
