-- ============================================================
-- CAMPAIGN REPORTS — Stage 1
-- ============================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.campaign_report_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- campaign_reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_email TEXT,
  report_name TEXT NOT NULL,
  intro_note TEXT,
  sections_included JSONB NOT NULL DEFAULT '["dashboard","dataset","flagged"]'::jsonb,
  require_email_to_view BOOLEAN NOT NULL DEFAULT false,
  public_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  status public.campaign_report_status NOT NULL DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_storage_path TEXT,
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_executive_summary TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_reports_campaign ON public.campaign_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_customer ON public.campaign_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_token ON public.campaign_reports(public_token);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_status ON public.campaign_reports(status);

ALTER TABLE public.campaign_reports ENABLE ROW LEVEL SECURITY;

-- Staff can view all reports
CREATE POLICY "Staff can view campaign reports"
ON public.campaign_reports FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Staff can insert
CREATE POLICY "Staff can create campaign reports"
ON public.campaign_reports FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Staff can update (revoke, extend, regenerate)
CREATE POLICY "Staff can update campaign reports"
ON public.campaign_reports FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Staff can delete
CREATE POLICY "Staff can delete campaign reports"
ON public.campaign_reports FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- updated_at trigger
CREATE TRIGGER trg_campaign_reports_updated_at
BEFORE UPDATE ON public.campaign_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- report_views
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  viewer_email TEXT,
  viewer_ip_hash TEXT,
  user_agent TEXT,
  country TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_duration_seconds INT NOT NULL DEFAULT 0,
  sections_viewed JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_scroll_depth_percent INT NOT NULL DEFAULT 0,
  downloaded_pdf BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (report_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_report_views_report ON public.report_views(report_id);
CREATE INDEX IF NOT EXISTS idx_report_views_viewed_at ON public.report_views(viewed_at DESC);

ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;

-- Staff can read views for analytics
CREATE POLICY "Staff can view report views"
ON public.report_views FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- View tracking writes happen through an edge function with service role,
-- so no public INSERT policy is needed. Block direct client writes.

-- ------------------------------------------------------------
-- report_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.campaign_reports(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_report_audit_report ON public.report_audit_log(report_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_performed_at ON public.report_audit_log(performed_at DESC);

ALTER TABLE public.report_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view report audit log"
ON public.report_audit_log FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Staff can insert report audit log"
ON public.report_audit_log FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- ------------------------------------------------------------
-- Storage bucket for PDFs
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-reports', 'campaign-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Staff can read
CREATE POLICY "Staff can read campaign report PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-reports' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Staff can upload
CREATE POLICY "Staff can upload campaign report PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-reports' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Staff can delete
CREATE POLICY "Staff can delete campaign report PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-reports' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_audit_log;