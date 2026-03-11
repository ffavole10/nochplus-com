
CREATE TABLE public.ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT,
  relevance_score NUMERIC(3,2) DEFAULT 0.8,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge sources"
  ON public.ai_knowledge_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert knowledge sources"
  ON public.ai_knowledge_sources FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete knowledge sources"
  ON public.ai_knowledge_sources FOR DELETE TO authenticated
  USING (true);
