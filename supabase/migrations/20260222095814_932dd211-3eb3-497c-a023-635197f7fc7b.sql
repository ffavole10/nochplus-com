
-- Fix campaigns RLS: scope to owner
DROP POLICY IF EXISTS "Allow public read access on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public insert access on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public update access on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public delete access on campaigns" ON public.campaigns;

CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Fix charger_records RLS: scope through parent campaign's user_id
DROP POLICY IF EXISTS "Allow public read access on charger_records" ON public.charger_records;
DROP POLICY IF EXISTS "Allow public insert access on charger_records" ON public.charger_records;
DROP POLICY IF EXISTS "Allow public update access on charger_records" ON public.charger_records;
DROP POLICY IF EXISTS "Allow public delete access on charger_records" ON public.charger_records;

CREATE POLICY "Users can view own charger records"
  ON public.charger_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = charger_records.campaign_id
        AND (campaigns.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can insert own charger records"
  ON public.charger_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own charger records"
  ON public.charger_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = charger_records.campaign_id
        AND (campaigns.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can delete own charger records"
  ON public.charger_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = charger_records.campaign_id
        AND (campaigns.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
    )
  );
