
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN estimate_number ~ '^[0-9]+$'
    THEN CAST(estimate_number AS integer)
    ELSE 0 END
  ), 2131) + 1
  INTO next_num
  FROM public.estimates;
  
  NEW.estimate_number := LPAD(next_num::text, 7, '0');
  RETURN NEW;
END;
$$;
