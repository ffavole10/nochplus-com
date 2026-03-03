
-- Rate Cards table
CREATE TABLE public.rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate_cards" ON public.rate_cards FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_cards" ON public.rate_cards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_cards" ON public.rate_cards FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_cards" ON public.rate_cards FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_rate_cards_updated_at BEFORE UPDATE ON public.rate_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rate Card Items table
CREATE TABLE public.rate_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.rate_cards(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'flat',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_card_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rate_card_items" ON public.rate_card_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert rate_card_items" ON public.rate_card_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rate_card_items" ON public.rate_card_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete rate_card_items" ON public.rate_card_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Quote Rules table
CREATE TABLE public.quote_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  condition_type text NOT NULL,
  condition_operator text NOT NULL,
  condition_value text NOT NULL,
  action_type text NOT NULL,
  action_value text NOT NULL,
  category text NOT NULL,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read quote_rules" ON public.quote_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert quote_rules" ON public.quote_rules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update quote_rules" ON public.quote_rules FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete quote_rules" ON public.quote_rules FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_quote_rules_updated_at BEFORE UPDATE ON public.quote_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer Rate Overrides table
CREATE TABLE public.customer_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  rate_card_id uuid NOT NULL REFERENCES public.rate_cards(id) ON DELETE CASCADE,
  override_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read customer_rate_overrides" ON public.customer_rate_overrides FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert customer_rate_overrides" ON public.customer_rate_overrides FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update customer_rate_overrides" ON public.customer_rate_overrides FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete customer_rate_overrides" ON public.customer_rate_overrides FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_customer_rate_overrides_updated_at BEFORE UPDATE ON public.customer_rate_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default rate card function
CREATE OR REPLACE FUNCTION public.ensure_single_default_rate_card()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.rate_cards SET is_default = false WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_rate_card
BEFORE INSERT OR UPDATE ON public.rate_cards
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_rate_card();
