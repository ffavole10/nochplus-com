
ALTER TABLE public.charger_records
  ADD COLUMN IF NOT EXISTS ticket_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_created_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_solved_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_subject text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_reporting_source text DEFAULT NULL;
