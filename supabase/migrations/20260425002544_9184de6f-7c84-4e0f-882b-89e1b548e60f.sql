-- 1. access_notes on locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS access_notes text;

-- 2. work_orders link columns FIRST (needed before policies that reference them)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_partner_id ON public.work_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_site_id ON public.work_orders(site_id);

-- 3. site_contacts
CREATE TABLE IF NOT EXISTS public.site_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_site_contacts_site_id ON public.site_contacts(site_id);
CREATE INDEX IF NOT EXISTS idx_site_contacts_customer_id ON public.site_contacts(customer_id);

ALTER TABLE public.site_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Field capture admins manage site_contacts"
  ON public.site_contacts FOR ALL
  TO authenticated
  USING (public.is_field_capture_admin(auth.uid()))
  WITH CHECK (public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Technicians read site_contacts for assigned work orders"
  ON public.site_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.site_id = site_contacts.site_id
        AND wo.assigned_technician_id = auth.uid()
    )
  );

CREATE TRIGGER update_site_contacts_updated_at
  BEFORE UPDATE ON public.site_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Now add poc_id (after site_contacts exists)
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS poc_id uuid REFERENCES public.site_contacts(id) ON DELETE SET NULL;

-- 5. locations RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='locations'
      AND policyname='Field capture admins manage locations'
  ) THEN
    CREATE POLICY "Field capture admins manage locations"
      ON public.locations FOR ALL
      TO authenticated
      USING (public.is_field_capture_admin(auth.uid()))
      WITH CHECK (public.is_field_capture_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='locations'
      AND policyname='Technicians read locations for assigned work orders'
  ) THEN
    CREATE POLICY "Technicians read locations for assigned work orders"
      ON public.locations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.work_orders wo
          WHERE wo.site_id = locations.id
            AND wo.assigned_technician_id = auth.uid()
        )
      );
  END IF;
END $$;