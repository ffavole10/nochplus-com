
-- Add missing columns to work_order_photos for storage path + file size
ALTER TABLE public.work_order_photos
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_size_bytes integer;

-- Storage RLS: technicians can manage photos for their own work orders;
-- field capture admins can read/manage all.
DROP POLICY IF EXISTS "fc_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "fc_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "fc_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "fc_photos_delete" ON storage.objects;

CREATE POLICY "fc_photos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'field-capture-photos' AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id::text = (storage.foldername(name))[1]
        AND wo.assigned_technician_id = auth.uid()
    )
  )
);

CREATE POLICY "fc_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'field-capture-photos' AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id::text = (storage.foldername(name))[1]
        AND wo.assigned_technician_id = auth.uid()
    )
  )
);

CREATE POLICY "fc_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'field-capture-photos' AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id::text = (storage.foldername(name))[1]
        AND wo.assigned_technician_id = auth.uid()
    )
  )
);

CREATE POLICY "fc_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'field-capture-photos' AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id::text = (storage.foldername(name))[1]
        AND wo.assigned_technician_id = auth.uid()
    )
  )
);
