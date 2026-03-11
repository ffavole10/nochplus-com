
CREATE TABLE public.assessment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.noch_plus_submissions(id) ON DELETE CASCADE,
  submission_display_id text NOT NULL,
  customer_name text NOT NULL,
  company_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'Medium',
  charger_count integer NOT NULL DEFAULT 0,
  pdf_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read assessment_reports" ON public.assessment_reports
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Staff can insert assessment_reports" ON public.assessment_reports
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Staff can update assessment_reports" ON public.assessment_reports
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Admin can delete assessment_reports" ON public.assessment_reports
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
