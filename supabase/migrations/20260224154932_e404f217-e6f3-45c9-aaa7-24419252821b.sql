
-- Fix 1: Estimates RLS - Replace public policies with authenticated policies
DROP POLICY IF EXISTS "Allow public read access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow public insert access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow public update access on estimates" ON public.estimates;
DROP POLICY IF EXISTS "Allow public delete access on estimates" ON public.estimates;

CREATE POLICY "Authenticated can read estimates"
  ON public.estimates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert estimates"
  ON public.estimates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update estimates"
  ON public.estimates FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete estimates"
  ON public.estimates FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Fix 2: Make field-reports bucket private
UPDATE storage.buckets SET public = false WHERE id = 'field-reports';

-- Fix 3: Make submission-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'submission-photos';

-- Fix 4: Make swi-documents private (contains proprietary procedures)
UPDATE storage.buckets SET public = false WHERE id = 'swi-documents';

-- Fix 5: Update storage RLS policies for field-reports
DROP POLICY IF EXISTS "Public read access for field reports" ON storage.objects;
CREATE POLICY "Authenticated can read field reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'field-reports' AND auth.uid() IS NOT NULL);

-- Fix 6: Update storage RLS for submission-photos  
DROP POLICY IF EXISTS "Anyone can upload submission photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for submission photos" ON storage.objects;

CREATE POLICY "Authenticated can read submission photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'submission-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload submission photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submission-photos' AND auth.uid() IS NOT NULL);

-- Fix 7: Update storage RLS for swi-documents
DROP POLICY IF EXISTS "Public read access for SWI documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read SWI documents" ON storage.objects;

CREATE POLICY "Authenticated can read swi documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'swi-documents' AND auth.uid() IS NOT NULL);
