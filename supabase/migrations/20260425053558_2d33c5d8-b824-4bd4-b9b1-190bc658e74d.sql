-- Phase A: Job Type support for work orders

-- 1. Create job_type enum with all 6 reserved values
CREATE TYPE public.work_order_job_type AS ENUM (
  'repair',
  'troubleshooting',
  'installation',
  'maintenance',
  'commissioning',
  'decommissioning'
);

-- 2. Add job_type to work_orders (default repair)
ALTER TABLE public.work_orders
  ADD COLUMN job_type public.work_order_job_type NOT NULL DEFAULT 'repair';

-- 3. Add dispatcher-provided diagnosis fields to work_order_chargers
ALTER TABLE public.work_order_chargers
  ADD COLUMN reported_issue_category public.charger_issue_category,
  ADD COLUMN reported_root_cause public.charger_root_cause,
  ADD COLUMN reported_description text,
  ADD COLUMN reported_recurring boolean NOT NULL DEFAULT false;

-- 4. Backfill existing WO-2026-0001: set repair (already default) and copy any
--    existing tech-side diagnosis values into the reported_* columns so the
--    legacy record displays correctly in the new Repair UI.
UPDATE public.work_order_chargers c
SET
  reported_issue_category = COALESCE(c.reported_issue_category, c.issue_category),
  reported_root_cause     = COALESCE(c.reported_root_cause, c.root_cause),
  reported_description    = COALESCE(c.reported_description, c.issue_description),
  reported_recurring      = COALESCE(c.is_recurring_issue, false)
WHERE c.work_order_id IN (
  SELECT id FROM public.work_orders WHERE work_order_number = 'WO-2026-0001'
);
