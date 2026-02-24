
-- Restrict submissions SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read by submission_id" ON public.submissions;

CREATE POLICY "Staff can read submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Restrict charger_submissions SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read charger submissions" ON public.charger_submissions;

CREATE POLICY "Staff can read charger submissions"
  ON public.charger_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);
