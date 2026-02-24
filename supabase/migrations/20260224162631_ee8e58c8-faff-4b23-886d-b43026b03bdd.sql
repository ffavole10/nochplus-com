
-- 1. Fix rate_sheets public policies (also addresses SUPA_rls_policy_always_true)
DROP POLICY IF EXISTS "Allow public read access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public insert access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public update access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public delete access on rate_sheets" ON public.rate_sheets;

CREATE POLICY "Authenticated can read rate_sheets" ON public.rate_sheets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_sheets" ON public.rate_sheets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_sheets" ON public.rate_sheets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_sheets" ON public.rate_sheets FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public insert access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public update access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public delete access on rate_sheet_items" ON public.rate_sheet_items;

CREATE POLICY "Authenticated can read rate_sheet_items" ON public.rate_sheet_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_sheet_items" ON public.rate_sheet_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_sheet_items" ON public.rate_sheet_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_sheet_items" ON public.rate_sheet_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- 2. Change notification triggers to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.notify_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (title, message, type, reference_id)
  VALUES (
    'New Assessment Submission',
    'New submission from ' || NEW.full_name || ' (' || NEW.company_name || ') - ' || NEW.city || ', ' || NEW.state,
    'new_submission',
    NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_submission_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (title, message, type, reference_id)
    VALUES (
      'Submission Approved',
      'Submission from ' || NEW.full_name || ' (' || NEW.company_name || ') has been approved',
      'submission_approved',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_campaign_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (type, title, message, reference_id)
  VALUES (
    'campaign_created',
    'New Campaign Created',
    'Campaign "' || NEW.name || '" for ' || NEW.customer || ' has been created.',
    NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_charger_critical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Critical' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'Critical') THEN
    INSERT INTO public.notifications (type, title, message, reference_id)
    VALUES (
      'charger_critical',
      'Charger Flagged Critical',
      'Charger ' || COALESCE(NEW.station_id, 'Unknown') || ' at ' || COALESCE(NEW.site_name, 'Unknown Site') || ' is now Critical.',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Restrict ai_execution_log to admin roles only
DROP POLICY IF EXISTS "Authenticated can read ai_execution_log" ON public.ai_execution_log;
DROP POLICY IF EXISTS "Authenticated can insert ai_execution_log" ON public.ai_execution_log;

CREATE POLICY "Admin can read ai_execution_log" ON public.ai_execution_log FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert ai_execution_log" ON public.ai_execution_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
