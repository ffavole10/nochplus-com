
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-proposals', 'campaign-proposals', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload proposals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-proposals');

CREATE POLICY "Authenticated users can read proposals"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'campaign-proposals');

CREATE POLICY "Authenticated users can update proposals"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campaign-proposals');

CREATE POLICY "Authenticated users can delete proposals"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-proposals');
