
-- Create storage bucket for SWI documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('swi-documents', 'swi-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for SWI documents
CREATE POLICY "SWI documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'swi-documents');

-- Authenticated users can upload SWI documents
CREATE POLICY "Authenticated users can upload SWI documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'swi-documents' AND auth.uid() IS NOT NULL);

-- Authenticated users can update SWI documents
CREATE POLICY "Authenticated users can update SWI documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'swi-documents' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete SWI documents
CREATE POLICY "Authenticated users can delete SWI documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'swi-documents' AND auth.uid() IS NOT NULL);
