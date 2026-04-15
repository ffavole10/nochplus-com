
-- NOCH+ Partnership Hub tables

CREATE TABLE public.noch_plus_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.noch_plus_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.noch_plus_members(id) ON DELETE CASCADE,
  site_name text NOT NULL DEFAULT '',
  l2_charger_count integer NOT NULL DEFAULT 0,
  dc_charger_count integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'priority',
  monthly_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.noch_plus_partnership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.noch_plus_members(id) ON DELETE SET NULL,
  plan_token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  company_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_monthly numeric NOT NULL DEFAULT 0,
  total_annual numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'shared',
  shared_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.noch_plus_sla_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.noch_plus_members(id) ON DELETE CASCADE,
  service_call_id text,
  sla_target_hours integer NOT NULL DEFAULT 48,
  actual_response_hours numeric NOT NULL DEFAULT 0,
  credit_percentage numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  applied_to_invoice boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.noch_plus_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies

ALTER TABLE public.noch_plus_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noch_plus_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noch_plus_partnership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noch_plus_sla_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noch_plus_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Staff can do everything on these tables
CREATE POLICY "Staff can read noch_plus_members" ON public.noch_plus_members FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can insert noch_plus_members" ON public.noch_plus_members FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can update noch_plus_members" ON public.noch_plus_members FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Admin can delete noch_plus_members" ON public.noch_plus_members FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can read noch_plus_sites" ON public.noch_plus_sites FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can insert noch_plus_sites" ON public.noch_plus_sites FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can update noch_plus_sites" ON public.noch_plus_sites FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can delete noch_plus_sites" ON public.noch_plus_sites FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can read noch_plus_partnership_plans" ON public.noch_plus_partnership_plans FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can insert noch_plus_partnership_plans" ON public.noch_plus_partnership_plans FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can update noch_plus_partnership_plans" ON public.noch_plus_partnership_plans FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Admin can delete noch_plus_partnership_plans" ON public.noch_plus_partnership_plans FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Public can view plans by token (partner-facing activation page)
CREATE POLICY "Anyone can view plans by token" ON public.noch_plus_partnership_plans FOR SELECT USING (true);

CREATE POLICY "Staff can read noch_plus_sla_credits" ON public.noch_plus_sla_credits FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can insert noch_plus_sla_credits" ON public.noch_plus_sla_credits FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can update noch_plus_sla_credits" ON public.noch_plus_sla_credits FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Staff can read noch_plus_knowledge_base" ON public.noch_plus_knowledge_base FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can insert noch_plus_knowledge_base" ON public.noch_plus_knowledge_base FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can update noch_plus_knowledge_base" ON public.noch_plus_knowledge_base FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role)
);
CREATE POLICY "Staff can delete noch_plus_knowledge_base" ON public.noch_plus_knowledge_base FOR DELETE USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
