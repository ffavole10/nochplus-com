-- Enterprise inquiries from "Contact Us" modal on Plan Tiers tab
CREATE TYPE public.enterprise_inquiry_status AS ENUM ('new', 'contacted', 'qualified', 'closed');

CREATE TABLE public.noch_plus_enterprise_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  estimated_charger_count INTEGER,
  message TEXT,
  status public.enterprise_inquiry_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.noch_plus_enterprise_inquiries ENABLE ROW LEVEL SECURITY;

-- Public can submit an inquiry (lead capture form, no auth required)
CREATE POLICY "Anyone can submit an enterprise inquiry"
  ON public.noch_plus_enterprise_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Only admins/managers can view, update, delete inquiries
CREATE POLICY "Admins can view enterprise inquiries"
  ON public.noch_plus_enterprise_inquiries
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

CREATE POLICY "Admins can update enterprise inquiries"
  ON public.noch_plus_enterprise_inquiries
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

CREATE POLICY "Admins can delete enterprise inquiries"
  ON public.noch_plus_enterprise_inquiries
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE TRIGGER update_noch_plus_enterprise_inquiries_updated_at
  BEFORE UPDATE ON public.noch_plus_enterprise_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_noch_plus_enterprise_inquiries_status ON public.noch_plus_enterprise_inquiries(status);
CREATE INDEX idx_noch_plus_enterprise_inquiries_created_at ON public.noch_plus_enterprise_inquiries(created_at DESC);
