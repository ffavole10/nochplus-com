
-- Create storage bucket for field report PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('field-reports', 'field-reports', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload field reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'field-reports' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Public read access for field reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'field-reports');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete field reports"
ON storage.objects FOR DELETE
USING (bucket_id = 'field-reports' AND auth.uid() IS NOT NULL);
