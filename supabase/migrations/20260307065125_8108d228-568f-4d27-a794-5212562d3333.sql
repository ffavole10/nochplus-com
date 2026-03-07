
-- Drop the overly permissive public SELECT policies
DROP POLICY IF EXISTS "Anyone can read by submission_id" ON public.submissions;
DROP POLICY IF EXISTS "Anyone can read charger submissions" ON public.charger_submissions;

-- Ensure authenticated-only SELECT policies exist
-- (Drop existing ones first to avoid duplicates)
DROP POLICY IF EXISTS "Staff can read submissions" ON public.submissions;
DROP POLICY IF EXISTS "Staff can read charger submissions" ON public.charger_submissions;

CREATE POLICY "Staff can read submissions" ON public.submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can read charger submissions" ON public.charger_submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);
