
-- Enable trigram extension for partial text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create parts_catalog table
CREATE TABLE public.parts_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number     text,
  description     text NOT NULL,
  unit_price      numeric(10,2) NOT NULL DEFAULT 0,
  unit            text DEFAULT 'each',
  category        text,
  manufacturer    text,
  notes           text,
  usage_count     integer NOT NULL DEFAULT 0,
  last_used_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_parts_catalog_description 
  ON public.parts_catalog USING gin(to_tsvector('english', description));

-- Trigram index for partial matching
CREATE INDEX idx_parts_catalog_description_trgm
  ON public.parts_catalog USING gin(description gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do all operations
CREATE POLICY "Authenticated can select parts_catalog"
  ON public.parts_catalog FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert parts_catalog"
  ON public.parts_catalog FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update parts_catalog"
  ON public.parts_catalog FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete parts_catalog"
  ON public.parts_catalog FOR DELETE TO authenticated
  USING (true);
