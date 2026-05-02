
-- Enums
DO $$ BEGIN CREATE TYPE public.strategy_status AS ENUM ('needs_review','active','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_position AS ENUM ('pre_engagement','active_dialogue','pilot','contracted','at_risk','champion'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_account_type AS ENUM ('revenue','strategic_partner','reference','beachhead','defensive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_decision_role AS ENUM ('champion','decision_maker','blocker','influencer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_temperature AS ENUM ('cold','warm','hot'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_play_status AS ENUM ('not_started','in_progress','complete','abandoned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_kpi_unit AS ENUM ('dollar','percent','count','yes_no','multiplier','days','months','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.strategy_risk_severity AS ENUM ('watch','risk','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- account_strategies
CREATE TABLE public.account_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  north_star text,
  account_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  strategic_value text,
  current_position public.strategy_position NOT NULL DEFAULT 'pre_engagement',
  status public.strategy_status NOT NULL DEFAULT 'needs_review',
  owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz
);
ALTER TABLE public.account_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can view strategies" ON public.account_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can insert strategies" ON public.account_strategies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authed users can update strategies" ON public.account_strategies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authed users can delete strategies" ON public.account_strategies FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_account_strategies_updated_at BEFORE UPDATE ON public.account_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- decision map
CREATE TABLE public.strategy_decision_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.account_strategies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  role public.strategy_decision_role NOT NULL,
  temperature public.strategy_temperature NOT NULL DEFAULT 'warm',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.strategy_decision_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can view decision map" ON public.strategy_decision_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can insert decision map" ON public.strategy_decision_map FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authed users can update decision map" ON public.strategy_decision_map FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authed users can delete decision map" ON public.strategy_decision_map FOR DELETE TO authenticated USING (true);

-- plays
CREATE TABLE public.strategy_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.account_strategies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  owner text,
  due_date date,
  quarter text,
  status public.strategy_play_status NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.strategy_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can view plays" ON public.strategy_plays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can insert plays" ON public.strategy_plays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authed users can update plays" ON public.strategy_plays FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authed users can delete plays" ON public.strategy_plays FOR DELETE TO authenticated USING (true);

-- kpis
CREATE TABLE public.strategy_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.account_strategies(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit public.strategy_kpi_unit NOT NULL DEFAULT 'count',
  target_value numeric,
  current_value numeric NOT NULL DEFAULT 0,
  target_date date,
  kpi_template_origin text,
  is_primary boolean NOT NULL DEFAULT true,
  is_deferred boolean NOT NULL DEFAULT false,
  deferred_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.strategy_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can view kpis" ON public.strategy_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can insert kpis" ON public.strategy_kpis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authed users can update kpis" ON public.strategy_kpis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authed users can delete kpis" ON public.strategy_kpis FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_strategy_kpis_updated_at BEFORE UPDATE ON public.strategy_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- risks
CREATE TABLE public.strategy_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.account_strategies(id) ON DELETE CASCADE,
  risk_text text NOT NULL,
  severity public.strategy_risk_severity NOT NULL DEFAULT 'risk',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.strategy_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed users can view risks" ON public.strategy_risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can insert risks" ON public.strategy_risks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authed users can update risks" ON public.strategy_risks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authed users can delete risks" ON public.strategy_risks FOR DELETE TO authenticated USING (true);

-- profile flag for tour
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_strategy_tour boolean NOT NULL DEFAULT false;

-- indexes
CREATE INDEX idx_strategy_decision_map_strategy ON public.strategy_decision_map(strategy_id);
CREATE INDEX idx_strategy_plays_strategy ON public.strategy_plays(strategy_id);
CREATE INDEX idx_strategy_kpis_strategy ON public.strategy_kpis(strategy_id);
CREATE INDEX idx_strategy_risks_strategy ON public.strategy_risks(strategy_id);
