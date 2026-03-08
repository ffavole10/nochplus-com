
-- Create noch_plus_submissions table for assessment submissions
CREATE TABLE public.noch_plus_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL,
  submission_type TEXT NOT NULL DEFAULT 'assessment',
  company_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  referral_source TEXT,
  assessment_needs TEXT[] DEFAULT '{}'::TEXT[],
  service_urgency TEXT,
  customer_notes TEXT,
  staff_notes TEXT,
  noch_plus_member BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_tickets table for repair submissions
CREATE TABLE public.service_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'New',
  company_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  oem_ticket_exists TEXT,
  oem_ticket_number TEXT,
  customer_notes TEXT,
  staff_notes TEXT,
  service_urgency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.noch_plus_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- noch_plus_submissions RLS: anyone can insert (public form), staff can read/update/delete
CREATE POLICY "Anyone can submit assessments" ON public.noch_plus_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read assessments" ON public.noch_plus_submissions FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update assessments" ON public.noch_plus_submissions FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete assessments" ON public.noch_plus_submissions FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- service_tickets RLS: anyone can insert (public form), staff can read/update/delete
CREATE POLICY "Anyone can submit repair tickets" ON public.service_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read service tickets" ON public.service_tickets FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update service tickets" ON public.service_tickets FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete service tickets" ON public.service_tickets FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- Also add a charger_submissions link for noch_plus_submissions
-- The existing charger_submissions table references submissions(id). 
-- We need a new linking table for noch_plus_submissions chargers
CREATE TABLE public.assessment_chargers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.noch_plus_submissions(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  charger_type TEXT NOT NULL,
  serial_number TEXT,
  installation_location TEXT,
  known_issues TEXT,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- And for service_tickets chargers
CREATE TABLE public.ticket_chargers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  charger_type TEXT NOT NULL,
  serial_number TEXT,
  installation_location TEXT,
  known_issues TEXT,
  is_working TEXT,
  under_warranty TEXT,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_chargers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert assessment chargers" ON public.assessment_chargers FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read assessment chargers" ON public.assessment_chargers FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update assessment chargers" ON public.assessment_chargers FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete assessment chargers" ON public.assessment_chargers FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can insert ticket chargers" ON public.ticket_chargers FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can read ticket chargers" ON public.ticket_chargers FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update ticket chargers" ON public.ticket_chargers FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete ticket chargers" ON public.ticket_chargers FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);
