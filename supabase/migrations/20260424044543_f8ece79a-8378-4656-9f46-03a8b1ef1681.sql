-- =========================================================================
-- Field Capture: tables, helpers, RLS, storage
-- =========================================================================

-- Helper: is the current user an admin-level role?
CREATE OR REPLACE FUNCTION public.is_field_capture_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::app_role) OR
    public.has_role(_user_id, 'admin'::app_role) OR
    public.has_role(_user_id, 'manager'::app_role) OR
    public.has_role(_user_id, 'account_manager'::app_role)
$$;

-- Helper: is the current user a technician?
CREATE OR REPLACE FUNCTION public.is_technician(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'technician'::app_role)
$$;

-- =========================================================================
-- Enums for Field Capture
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.work_order_status AS ENUM (
    'scheduled','in_progress','submitted','pending_review','flagged','approved','closed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.charger_capture_status AS ENUM ('not_started','in_progress','complete');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.charger_issue_category AS ENUM (
    'power_issue','screen_display','connector','payment_processing',
    'network_connectivity','physical_damage','other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.charger_root_cause AS ENUM (
    'hardware_fault','firmware','network','power_supply','physical_damage','wear','unknown'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.charger_post_work_status AS ENUM (
    'operational','partially_functional','non_operational_followup','requires_parts_ordered'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.field_photo_type AS ENUM (
    'before','during','after','old_serial','new_serial','return_receipt','loto_verification'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.briefing_type AS ENUM ('full_briefing','condensed_briefing');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================================
-- work_orders
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT UNIQUE,
  client_name TEXT NOT NULL,
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  assigned_technician_id UUID NOT NULL,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.work_order_status NOT NULL DEFAULT 'scheduled',
  arrival_timestamp TIMESTAMPTZ,
  departure_timestamp TIMESTAMPTZ,
  gps_location TEXT,
  support_time_minutes INTEGER,
  access_time_minutes INTEGER,
  job_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wo_assigned_tech ON public.work_orders(assigned_technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_wo_status ON public.work_orders(status);

-- Auto-generate work_order_number: WO-YYYY-NNNN
CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    next_num := nextval('public.work_order_number_seq');
    NEW.work_order_number := 'WO-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_work_order_number ON public.work_orders;
CREATE TRIGGER trg_set_work_order_number
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_work_order_number();

DROP TRIGGER IF EXISTS trg_wo_updated_at ON public.work_orders;
CREATE TRIGGER trg_wo_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- work_order_chargers
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.work_order_chargers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  charger_position INTEGER NOT NULL DEFAULT 1,
  make_model TEXT,
  serial_number TEXT,
  status public.charger_capture_status NOT NULL DEFAULT 'not_started',
  added_on_site BOOLEAN NOT NULL DEFAULT false,
  issue_category public.charger_issue_category,
  issue_description TEXT,
  root_cause public.charger_root_cause,
  is_recurring_issue BOOLEAN NOT NULL DEFAULT false,
  work_performed TEXT,
  parts_swap_performed BOOLEAN NOT NULL DEFAULT false,
  old_serial_number TEXT,
  new_serial_number TEXT,
  resolution TEXT,
  charger_status_post_work public.charger_post_work_status,
  capture_started_at TIMESTAMPTZ,
  capture_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_woc_wo ON public.work_order_chargers(work_order_id);

DROP TRIGGER IF EXISTS trg_woc_updated_at ON public.work_order_chargers;
CREATE TRIGGER trg_woc_updated_at
BEFORE UPDATE ON public.work_order_chargers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- work_order_photos
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.work_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  charger_id UUID REFERENCES public.work_order_chargers(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type public.field_photo_type NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wop_wo ON public.work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wop_charger ON public.work_order_photos(charger_id);

-- =========================================================================
-- safety_briefings_log
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.safety_briefings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL,
  briefing_type public.briefing_type NOT NULL,
  briefing_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  briefing_completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  ppe_confirmed BOOLEAN NOT NULL DEFAULT false,
  area_secured_confirmed BOOLEAN NOT NULL DEFAULT false,
  sow_reviewed_confirmed BOOLEAN NOT NULL DEFAULT false,
  loto_performed BOOLEAN NOT NULL DEFAULT false,
  zero_energy_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sb_tech_date ON public.safety_briefings_log(technician_id, created_at);

-- =========================================================================
-- Row Level Security
-- =========================================================================
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_briefings_log ENABLE ROW LEVEL SECURITY;

-- ---- work_orders ----
DROP POLICY IF EXISTS "wo_select_own_or_admin" ON public.work_orders;
CREATE POLICY "wo_select_own_or_admin" ON public.work_orders
FOR SELECT TO authenticated
USING (
  assigned_technician_id = auth.uid()
  OR public.is_field_capture_admin(auth.uid())
);

DROP POLICY IF EXISTS "wo_insert_admin" ON public.work_orders;
CREATE POLICY "wo_insert_admin" ON public.work_orders
FOR INSERT TO authenticated
WITH CHECK (public.is_field_capture_admin(auth.uid()));

DROP POLICY IF EXISTS "wo_update_own_or_admin" ON public.work_orders;
CREATE POLICY "wo_update_own_or_admin" ON public.work_orders
FOR UPDATE TO authenticated
USING (
  assigned_technician_id = auth.uid()
  OR public.is_field_capture_admin(auth.uid())
)
WITH CHECK (
  assigned_technician_id = auth.uid()
  OR public.is_field_capture_admin(auth.uid())
);

DROP POLICY IF EXISTS "wo_delete_admin" ON public.work_orders;
CREATE POLICY "wo_delete_admin" ON public.work_orders
FOR DELETE TO authenticated
USING (public.is_field_capture_admin(auth.uid()));

-- ---- work_order_chargers ----
DROP POLICY IF EXISTS "woc_select" ON public.work_order_chargers;
CREATE POLICY "woc_select" ON public.work_order_chargers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_chargers.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "woc_insert" ON public.work_order_chargers;
CREATE POLICY "woc_insert" ON public.work_order_chargers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_chargers.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "woc_update" ON public.work_order_chargers;
CREATE POLICY "woc_update" ON public.work_order_chargers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_chargers.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_chargers.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "woc_delete" ON public.work_order_chargers;
CREATE POLICY "woc_delete" ON public.work_order_chargers
FOR DELETE TO authenticated
USING (public.is_field_capture_admin(auth.uid()));

-- ---- work_order_photos ----
DROP POLICY IF EXISTS "wop_select" ON public.work_order_photos;
CREATE POLICY "wop_select" ON public.work_order_photos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_photos.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "wop_insert" ON public.work_order_photos;
CREATE POLICY "wop_insert" ON public.work_order_photos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_photos.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "wop_delete" ON public.work_order_photos;
CREATE POLICY "wop_delete" ON public.work_order_photos
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_photos.work_order_id
      AND (w.assigned_technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid()))
  )
);

-- ---- safety_briefings_log ----
DROP POLICY IF EXISTS "sb_select" ON public.safety_briefings_log;
CREATE POLICY "sb_select" ON public.safety_briefings_log
FOR SELECT TO authenticated
USING (
  technician_id = auth.uid() OR public.is_field_capture_admin(auth.uid())
);

DROP POLICY IF EXISTS "sb_insert" ON public.safety_briefings_log;
CREATE POLICY "sb_insert" ON public.safety_briefings_log
FOR INSERT TO authenticated
WITH CHECK (
  technician_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = safety_briefings_log.work_order_id
      AND w.assigned_technician_id = auth.uid()
  )
);

-- =========================================================================
-- Storage bucket: field-capture-photos (private; signed URLs for display)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-capture-photos', 'field-capture-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {work_order_id}/{charger_id_or_'job'}/{photo_type}/{filename}
-- Technician may insert/select/delete only when first folder = a work_order assigned to them.

DROP POLICY IF EXISTS "fcp_select_own_or_admin" ON storage.objects;
CREATE POLICY "fcp_select_own_or_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'field-capture-photos'
  AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.id::text = (storage.foldername(name))[1]
        AND w.assigned_technician_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "fcp_insert_assigned_tech_or_admin" ON storage.objects;
CREATE POLICY "fcp_insert_assigned_tech_or_admin" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'field-capture-photos'
  AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.id::text = (storage.foldername(name))[1]
        AND w.assigned_technician_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "fcp_delete_assigned_tech_or_admin" ON storage.objects;
CREATE POLICY "fcp_delete_assigned_tech_or_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'field-capture-photos'
  AND (
    public.is_field_capture_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.id::text = (storage.foldername(name))[1]
        AND w.assigned_technician_id = auth.uid()
    )
  )
);
