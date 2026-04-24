-- Add SOW document URL column (job_notes already exists on work_orders)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS sow_document_url text,
  ADD COLUMN IF NOT EXISTS sow_document_name text;

-- Storage bucket for SOW / instruction PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-capture-docs', 'field-capture-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Field capture admins can upload SOW documents
CREATE POLICY "Field capture admins can upload SOW docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'field-capture-docs'
  AND public.is_field_capture_admin(auth.uid())
);

-- Field capture admins can update / replace SOW documents
CREATE POLICY "Field capture admins can update SOW docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'field-capture-docs'
  AND public.is_field_capture_admin(auth.uid())
);

-- Field capture admins can delete SOW documents
CREATE POLICY "Field capture admins can delete SOW docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'field-capture-docs'
  AND public.is_field_capture_admin(auth.uid())
);

-- Authenticated users (admins + assigned techs) can read SOW documents
CREATE POLICY "Authenticated users can read SOW docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'field-capture-docs');
