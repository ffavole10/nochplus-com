
-- AI Agent Prompts configuration table
CREATE TABLE public.ai_agent_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  template text NOT NULL DEFAULT '',
  temperature numeric NOT NULL DEFAULT 0.3,
  max_tokens integer NOT NULL DEFAULT 1500,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  status text NOT NULL DEFAULT 'active',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Learning Patterns table (for ML section)
CREATE TABLE public.ai_learning_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_name text NOT NULL,
  symptom_cluster text[] DEFAULT '{}',
  environmental_factor text,
  recommended_swi text,
  confidence_boost integer DEFAULT 0,
  sample_count integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Execution Log table (for metrics)
CREATE TABLE public.ai_execution_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  ticket_id text,
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  execution_time_ms integer,
  tokens_used integer,
  confidence_score numeric,
  status text NOT NULL DEFAULT 'success',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_execution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only authenticated users can access
CREATE POLICY "Authenticated can read ai_agent_prompts" ON public.ai_agent_prompts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert ai_agent_prompts" ON public.ai_agent_prompts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update ai_agent_prompts" ON public.ai_agent_prompts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete ai_agent_prompts" ON public.ai_agent_prompts FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read ai_learning_patterns" ON public.ai_learning_patterns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert ai_learning_patterns" ON public.ai_learning_patterns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update ai_learning_patterns" ON public.ai_learning_patterns FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete ai_learning_patterns" ON public.ai_learning_patterns FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read ai_execution_log" ON public.ai_execution_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert ai_execution_log" ON public.ai_execution_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_ai_agent_prompts_updated_at
  BEFORE UPDATE ON public.ai_agent_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_learning_patterns_updated_at
  BEFORE UPDATE ON public.ai_learning_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
