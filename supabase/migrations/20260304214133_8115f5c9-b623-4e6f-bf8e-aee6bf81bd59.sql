
DROP TRIGGER IF EXISTS set_estimate_number ON public.estimates;
CREATE TRIGGER set_estimate_number
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  WHEN (NEW.estimate_number IS NULL)
  EXECUTE FUNCTION public.generate_estimate_number();
