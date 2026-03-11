
CREATE TABLE public.deep_learning_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text NOT NULL DEFAULT 'PDF',
  file_size_kb integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  quality_score integer,
  records_extracted integer DEFAULT 0,
  patterns_added integer DEFAULT 0,
  uploaded_by text NOT NULL DEFAULT '',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  notes text
);

ALTER TABLE public.deep_learning_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read deep_learning_uploads" ON public.deep_learning_uploads
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Staff can insert deep_learning_uploads" ON public.deep_learning_uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Staff can update deep_learning_uploads" ON public.deep_learning_uploads
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

CREATE POLICY "Admin can delete deep_learning_uploads" ON public.deep_learning_uploads
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
