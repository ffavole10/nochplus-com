-- Section access table
CREATE TABLE public.user_section_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section_key text NOT NULL CHECK (section_key IN ('campaigns','service_desk','noch_plus','partners','autoheal')),
  has_access boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_key)
);

CREATE INDEX idx_user_section_access_user ON public.user_section_access(user_id);

ALTER TABLE public.user_section_access ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_name text,
  target_user_id uuid NOT NULL,
  target_name text,
  section_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('granted','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_audit_log_created ON public.access_audit_log(created_at DESC);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if a user has access to a section (super_admin always true)
CREATE OR REPLACE FUNCTION public.has_section_access(_user_id uuid, _section_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN public.has_role(_user_id, 'super_admin'::app_role) THEN true
      ELSE COALESCE(
        (SELECT has_access FROM public.user_section_access
          WHERE user_id = _user_id AND section_key = _section_key
          LIMIT 1),
        false
      )
    END
$$;

-- RLS policies for user_section_access
CREATE POLICY "Users can read own access rows"
  ON public.user_section_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert access rows"
  ON public.user_section_access FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update access rows"
  ON public.user_section_access FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete access rows"
  ON public.user_section_access FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for access_audit_log
CREATE POLICY "Super admins can read audit log"
  ON public.access_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert audit log"
  ON public.access_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Updated-at trigger
CREATE TRIGGER trg_user_section_access_updated_at
BEFORE UPDATE ON public.user_section_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();