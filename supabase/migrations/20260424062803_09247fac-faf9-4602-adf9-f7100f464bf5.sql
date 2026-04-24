ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS poc_name text,
  ADD COLUMN IF NOT EXISTS poc_phone text,
  ADD COLUMN IF NOT EXISTS poc_email text;