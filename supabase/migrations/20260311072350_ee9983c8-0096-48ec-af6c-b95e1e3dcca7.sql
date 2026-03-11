
CREATE TABLE public.autoheal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_controls JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_formatting JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.autoheal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read autoheal_config"
  ON public.autoheal_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Admin can insert autoheal_config"
  ON public.autoheal_config FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update autoheal_config"
  ON public.autoheal_config FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete autoheal_config"
  ON public.autoheal_config FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
