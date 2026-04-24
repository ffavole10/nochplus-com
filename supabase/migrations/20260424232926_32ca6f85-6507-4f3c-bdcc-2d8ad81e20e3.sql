-- 1. Extend work order status enum with cancelled + archived
ALTER TYPE public.work_order_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.work_order_status ADD VALUE IF NOT EXISTS 'archived';

-- 2. Add archive columns to work_orders
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID;

CREATE INDEX IF NOT EXISTS idx_work_orders_is_archived ON public.work_orders(is_archived);

-- 3. Activity log table
CREATE TABLE IF NOT EXISTS public.work_order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_label TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_woa_work_order ON public.work_order_activity(work_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_woa_actor ON public.work_order_activity(actor_id);

ALTER TABLE public.work_order_activity ENABLE ROW LEVEL SECURITY;

-- Admins can view all
CREATE POLICY "Admins view all activity"
ON public.work_order_activity
FOR SELECT
TO authenticated
USING (public.is_field_capture_admin(auth.uid()));

-- Admins can insert
CREATE POLICY "Admins insert activity"
ON public.work_order_activity
FOR INSERT
TO authenticated
WITH CHECK (public.is_field_capture_admin(auth.uid()));

-- Technicians can view activity for their own work orders
CREATE POLICY "Technicians view own work order activity"
ON public.work_order_activity
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = work_order_activity.work_order_id
      AND wo.assigned_technician_id = auth.uid()
  )
);

-- Technicians can insert activity for their own work orders (e.g. start/submit events)
CREATE POLICY "Technicians insert own work order activity"
ON public.work_order_activity
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = work_order_activity.work_order_id
      AND wo.assigned_technician_id = auth.uid()
  )
);

-- No UPDATE / DELETE policies => append-only by default
