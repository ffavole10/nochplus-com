ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS rate_per_connector numeric(10,2);

UPDATE public.deals
SET rate_per_connector = 15.00
WHERE deal_type = 'recurring'
  AND recurring_model = 'per_connector'
  AND rate_per_connector IS NULL;