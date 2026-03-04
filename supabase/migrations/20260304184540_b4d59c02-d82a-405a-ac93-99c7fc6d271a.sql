
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS estimate_number text,
  ADD COLUMN IF NOT EXISTS terms text NOT NULL DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS service_date_range text;

-- Create a sequence-based estimate number trigger
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN estimate_number ~ '^EST-[0-9]+$'
    THEN CAST(SUBSTRING(estimate_number FROM 5) AS integer)
    ELSE 0 END
  ), 1000) + 1
  INTO next_num
  FROM public.estimates;
  
  NEW.estimate_number := 'EST-' || next_num;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_estimate_number
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  WHEN (NEW.estimate_number IS NULL)
  EXECUTE FUNCTION public.generate_estimate_number();
