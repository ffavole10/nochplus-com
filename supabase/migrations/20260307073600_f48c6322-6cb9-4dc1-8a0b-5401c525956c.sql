-- Fix: Restrict SWI catalog tables to staff roles only
DROP POLICY IF EXISTS "Anyone can read SWI entries" ON public.swi_catalog_entries;
DROP POLICY IF EXISTS "Anyone can read OEMs" ON public.swi_oems;

CREATE POLICY "Staff can read SWI entries" ON public.swi_catalog_entries
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
  );

CREATE POLICY "Staff can read OEMs" ON public.swi_oems
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
  );

-- Also harden SWI write policies to require roles instead of just auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "Authenticated users can insert SWI entries" ON public.swi_catalog_entries;
DROP POLICY IF EXISTS "Authenticated users can update SWI entries" ON public.swi_catalog_entries;
DROP POLICY IF EXISTS "Authenticated users can delete SWI entries" ON public.swi_catalog_entries;

CREATE POLICY "Staff can insert SWI entries" ON public.swi_catalog_entries
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Staff can update SWI entries" ON public.swi_catalog_entries
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admin can delete SWI entries" ON public.swi_catalog_entries
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  );

-- Same for swi_oems
DROP POLICY IF EXISTS "Authenticated users can insert OEMs" ON public.swi_oems;
DROP POLICY IF EXISTS "Authenticated users can update OEMs" ON public.swi_oems;
DROP POLICY IF EXISTS "Authenticated users can delete OEMs" ON public.swi_oems;

CREATE POLICY "Staff can insert OEMs" ON public.swi_oems
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Staff can update OEMs" ON public.swi_oems
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admin can delete OEMs" ON public.swi_oems
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  );

-- Also harden partners table (currently uses auth.uid() IS NOT NULL)
DROP POLICY IF EXISTS "Anyone can read partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated users can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated users can update partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated users can delete partners" ON public.partners;

CREATE POLICY "Staff can read partners" ON public.partners
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
  );
CREATE POLICY "Staff can insert partners" ON public.partners
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Staff can update partners" ON public.partners
  FOR UPDATE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Admin can delete partners" ON public.partners
  FOR DELETE USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  );