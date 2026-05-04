
-- Enums
CREATE TYPE public.qbr_quarter AS ENUM ('Q1','Q2','Q3','Q4');
CREATE TYPE public.qbr_status AS ENUM ('in_progress','prep_open','active','closed');
CREATE TYPE public.qbr_entry_mode AS ENUM ('auto','document_upload','manual','hybrid');
CREATE TYPE public.qbr_data_source AS ENUM ('auto','document','manual','quickbooks');

-- Main QBR table
CREATE TABLE public.quarterly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter public.qbr_quarter NOT NULL,
  year integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.qbr_status NOT NULL DEFAULT 'in_progress',
  entry_mode public.qbr_entry_mode NOT NULL DEFAULT 'manual',
  created_retroactively boolean NOT NULL DEFAULT false,
  source_document_path text,
  closed_at timestamptz,
  closed_by text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quarter, year)
);

-- Sections
CREATE TABLE public.qbr_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qbr_id uuid NOT NULL REFERENCES public.quarterly_reviews(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_source public.qbr_data_source NOT NULL DEFAULT 'manual',
  last_updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qbr_id, section_key)
);

-- Financial data (manual only)
CREATE TABLE public.qbr_financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qbr_id uuid NOT NULL UNIQUE REFERENCES public.quarterly_reviews(id) ON DELETE CASCADE,
  quarterly_revenue numeric,
  quarterly_expenses numeric,
  net_income numeric,
  cash_start numeric,
  cash_end numeric,
  avg_monthly_burn numeric,
  runway_months numeric,
  source text DEFAULT 'QuickBooks',
  entered_by text,
  entered_at timestamptz DEFAULT now(),
  notes text,
  supporting_document_path text
);

-- Focus accounts per quarter
CREATE TABLE public.qbr_focus_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qbr_id uuid NOT NULL REFERENCES public.quarterly_reviews(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  strategy_id uuid REFERENCES public.account_strategies(id) ON DELETE SET NULL,
  why_it_mattered text,
  what_we_achieved text,
  end_of_quarter_state text,
  order_index integer NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_qbr_sections_qbr ON public.qbr_sections(qbr_id);
CREATE INDEX idx_qbr_focus_accounts_qbr ON public.qbr_focus_accounts(qbr_id);

-- Updated-at triggers
CREATE TRIGGER quarterly_reviews_updated_at
  BEFORE UPDATE ON public.quarterly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER qbr_sections_updated_at
  BEFORE UPDATE ON public.qbr_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbr_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbr_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbr_focus_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read qbr" ON public.quarterly_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write qbr" ON public.quarterly_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read qbr_sections" ON public.qbr_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write qbr_sections" ON public.qbr_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read qbr_financial" ON public.qbr_financial_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write qbr_financial" ON public.qbr_financial_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read qbr_focus" ON public.qbr_focus_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write qbr_focus" ON public.qbr_focus_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for QBR uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('qbr-documents', 'qbr-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read qbr docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'qbr-documents');
CREATE POLICY "Authenticated upload qbr docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qbr-documents');
CREATE POLICY "Authenticated update qbr docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'qbr-documents');
CREATE POLICY "Authenticated delete qbr docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qbr-documents');
