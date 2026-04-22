-- ============ ENUMS ============
CREATE TYPE public.growth_tier AS ENUM ('A', 'B', 'C');
CREATE TYPE public.growth_motion AS ENUM ('Volume', 'Strategic', 'Government', 'OEM', 'New_Logo', 'Maintain');
CREATE TYPE public.growth_network_type AS ENUM ('CPO', 'CMS', 'OEM', 'Government', 'Fleet', 'Utility', 'Other');
CREATE TYPE public.growth_nochplus_timing AS ENUM ('Live', '0-3 months', '3-6 months', '6-12 months', '12+ months', 'Never');
CREATE TYPE public.stakeholder_role AS ENUM ('Decision Maker', 'Influencer', 'Champion', 'Blocker', 'Operational', 'Unknown');
CREATE TYPE public.relationship_status AS ENUM ('Cold', 'Warm', 'Hot', 'Champion');
CREATE TYPE public.deal_stage AS ENUM (
  'Account Mapped',
  'Relationship Warmed',
  'Expansion Opportunity Identified',
  'Proposal Out',
  'NOCH+ Introduced',
  'Pilot / Contract Signed',
  'Expanded & Recurring'
);
CREATE TYPE public.activity_type AS ENUM ('Call', 'Email', 'Meeting', 'LinkedIn', 'InPerson', 'Other');

-- ============ partners_meta ============
CREATE TABLE public.partners_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  tier public.growth_tier,
  motion public.growth_motion,
  network_type public.growth_network_type,
  charger_footprint_estimate INTEGER,
  charger_footprint_notes TEXT,
  hardware_brands JSONB NOT NULL DEFAULT '[]'::jsonb,
  regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  annual_run_rate NUMERIC(14,2),
  share_of_wallet_pct NUMERIC(5,2),
  services_provided JSONB NOT NULL DEFAULT '[]'::jsonb,
  services_not_provided JSONB NOT NULL DEFAULT '[]'::jsonb,
  expansion_thesis TEXT,
  white_space_notes TEXT,
  nochplus_fit_score INTEGER CHECK (nochplus_fit_score BETWEEN 1 AND 10),
  nochplus_timing public.growth_nochplus_timing,
  strategic_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partners_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read partners_meta" ON public.partners_meta FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert partners_meta" ON public.partners_meta FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update partners_meta" ON public.partners_meta FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete partners_meta" ON public.partners_meta FOR DELETE TO authenticated USING (true);

CREATE TRIGGER partners_meta_updated_at
BEFORE UPDATE ON public.partners_meta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ stakeholders ============
CREATE TABLE public.stakeholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  role public.stakeholder_role NOT NULL DEFAULT 'Unknown',
  relationship_status public.relationship_status NOT NULL DEFAULT 'Cold',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  last_touch_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stakeholders_partner ON public.stakeholders(partner_id);
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read stakeholders" ON public.stakeholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stakeholders" ON public.stakeholders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update stakeholders" ON public.stakeholders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete stakeholders" ON public.stakeholders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER stakeholders_updated_at
BEFORE UPDATE ON public.stakeholders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ deals ============
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  deal_name TEXT NOT NULL,
  description TEXT,
  stage public.deal_stage NOT NULL DEFAULT 'Account Mapped',
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  next_action TEXT,
  next_action_date DATE,
  expected_close_date DATE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_partner ON public.deals(partner_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read deals" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update deals" ON public.deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete deals" ON public.deals FOR DELETE TO authenticated USING (true);

CREATE TRIGGER deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ deal_stakeholders (M2M) ============
CREATE TABLE public.deal_stakeholders (
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, stakeholder_id)
);

CREATE INDEX idx_deal_stakeholders_stakeholder ON public.deal_stakeholders(stakeholder_id);
ALTER TABLE public.deal_stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read deal_stakeholders" ON public.deal_stakeholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deal_stakeholders" ON public.deal_stakeholders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete deal_stakeholders" ON public.deal_stakeholders FOR DELETE TO authenticated USING (true);

-- ============ activities ============
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL,
  type public.activity_type NOT NULL DEFAULT 'Other',
  summary TEXT NOT NULL DEFAULT '',
  outcome TEXT,
  next_step TEXT,
  next_step_date DATE,
  logged_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_partner ON public.activities(partner_id);
CREATE INDEX idx_activities_deal ON public.activities(deal_id);
CREATE INDEX idx_activities_stakeholder ON public.activities(stakeholder_id);
CREATE INDEX idx_activities_date ON public.activities(activity_date DESC);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update activities" ON public.activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete activities" ON public.activities FOR DELETE TO authenticated USING (true);

CREATE TRIGGER activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();