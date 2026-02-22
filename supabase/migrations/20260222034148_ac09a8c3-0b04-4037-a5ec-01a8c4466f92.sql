
-- Submissions table for public assessment requests
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id text NOT NULL UNIQUE, -- NP-2026-XXXX format
  status text NOT NULL DEFAULT 'pending_review',
  
  -- Customer info
  full_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  street_address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  referral_source text,
  
  -- Assessment needs
  assessment_needs text[] DEFAULT '{}',
  service_urgency text,
  customer_notes text,
  
  -- Noch+ membership
  noch_plus_member boolean NOT NULL DEFAULT false,
  
  -- Internal
  staff_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Charger submissions linked to parent submission
CREATE TABLE public.charger_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  brand text NOT NULL,
  serial_number text,
  charger_type text NOT NULL, -- 'AC | Level 2' or 'DC | Level 3'
  installation_location text,
  known_issues text,
  photo_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charger_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit forms)
CREATE POLICY "Anyone can submit" ON public.submissions FOR INSERT WITH CHECK (true);
-- Public can read their own by submission_id (tracking page)
CREATE POLICY "Anyone can read by submission_id" ON public.submissions FOR SELECT USING (true);
-- Authenticated users can update (internal staff)
CREATE POLICY "Authenticated can update submissions" ON public.submissions FOR UPDATE USING (auth.uid() IS NOT NULL);
-- Authenticated can delete
CREATE POLICY "Authenticated can delete submissions" ON public.submissions FOR DELETE USING (auth.uid() IS NOT NULL);

-- Charger submissions policies
CREATE POLICY "Anyone can insert charger submissions" ON public.charger_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read charger submissions" ON public.charger_submissions FOR SELECT USING (true);
CREATE POLICY "Authenticated can update charger submissions" ON public.charger_submissions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete charger submissions" ON public.charger_submissions FOR DELETE USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for submission photos
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-photos', 'submission-photos', true);

-- Storage policies for submission photos
CREATE POLICY "Anyone can upload submission photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submission-photos');
CREATE POLICY "Anyone can view submission photos" ON storage.objects FOR SELECT USING (bucket_id = 'submission-photos');

-- Sequence for submission IDs
CREATE SEQUENCE public.submission_id_seq START 1000;
