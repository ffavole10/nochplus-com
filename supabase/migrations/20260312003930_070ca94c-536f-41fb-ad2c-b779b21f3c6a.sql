
-- Regulatory Regions
CREATE TABLE public.regulatory_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_type text NOT NULL DEFAULT 'state',
  name text NOT NULL,
  state_code text NOT NULL,
  county text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  next_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regulatory_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access regulatory_regions SELECT" ON public.regulatory_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_regions INSERT" ON public.regulatory_regions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access regulatory_regions UPDATE" ON public.regulatory_regions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_regions DELETE" ON public.regulatory_regions FOR DELETE TO authenticated USING (true);

-- Regulatory Documents
CREATE TABLE public.regulatory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regulatory_regions(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  source_url text,
  source_name text,
  content_summary text,
  full_text text,
  version_hash text,
  effective_date date,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true
);

ALTER TABLE public.regulatory_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access regulatory_documents SELECT" ON public.regulatory_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_documents INSERT" ON public.regulatory_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access regulatory_documents UPDATE" ON public.regulatory_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_documents DELETE" ON public.regulatory_documents FOR DELETE TO authenticated USING (true);

-- Regulatory Changes
CREATE TABLE public.regulatory_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regulatory_regions(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.regulatory_documents(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  change_summary text,
  previous_hash text,
  new_hash text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by text,
  reviewed_at timestamptz
);

ALTER TABLE public.regulatory_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access regulatory_changes SELECT" ON public.regulatory_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_changes INSERT" ON public.regulatory_changes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access regulatory_changes UPDATE" ON public.regulatory_changes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_changes DELETE" ON public.regulatory_changes FOR DELETE TO authenticated USING (true);

-- Ticket Regulatory Context
CREATE TABLE public.ticket_regulatory_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regulatory_regions(id) ON DELETE CASCADE,
  applicable_docs uuid[],
  requires_permit boolean DEFAULT false,
  permit_authority text,
  requires_licensed_contractor boolean DEFAULT false,
  licensing_requirement text,
  available_incentives text,
  compliance_flags text[],
  context_injected_at timestamptz NOT NULL DEFAULT now(),
  max_prompt_version text
);

ALTER TABLE public.ticket_regulatory_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access ticket_regulatory_context SELECT" ON public.ticket_regulatory_context FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access ticket_regulatory_context INSERT" ON public.ticket_regulatory_context FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access ticket_regulatory_context UPDATE" ON public.ticket_regulatory_context FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access ticket_regulatory_context DELETE" ON public.ticket_regulatory_context FOR DELETE TO authenticated USING (true);

-- Regulatory Sync Log
CREATE TABLE public.regulatory_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'manual',
  regions_updated integer NOT NULL DEFAULT 0,
  documents_added integer NOT NULL DEFAULT 0,
  changes_detected integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running'
);

ALTER TABLE public.regulatory_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access regulatory_sync_log SELECT" ON public.regulatory_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_sync_log INSERT" ON public.regulatory_sync_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access regulatory_sync_log UPDATE" ON public.regulatory_sync_log FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access regulatory_sync_log DELETE" ON public.regulatory_sync_log FOR DELETE TO authenticated USING (true);
