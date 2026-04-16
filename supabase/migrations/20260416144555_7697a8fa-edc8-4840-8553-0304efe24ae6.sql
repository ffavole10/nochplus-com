
-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT,
  page_title TEXT,
  action_name TEXT,
  session_id UUID,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast analytics queries
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs (user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs (created_at DESC);
CREATE INDEX idx_user_activity_logs_event_type ON public.user_activity_logs (event_type);
CREATE INDEX idx_user_activity_logs_session_id ON public.user_activity_logs (session_id);
CREATE INDEX idx_user_activity_logs_user_created ON public.user_activity_logs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins can read all activity logs
CREATE POLICY "Admins can read all activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Enable realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_logs;
