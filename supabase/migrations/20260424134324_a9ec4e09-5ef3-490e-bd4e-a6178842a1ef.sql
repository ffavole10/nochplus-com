ALTER TABLE public.work_order_chargers
ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 1;