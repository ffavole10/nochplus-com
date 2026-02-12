
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'campaign_created', 'charger_critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT, -- campaign_id or charger record id
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read notifications (global notifications)
CREATE POLICY "Authenticated users can read notifications"
ON public.notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only system (via triggers) inserts notifications; allow authenticated for completeness
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can mark as read
CREATE POLICY "Authenticated users can update notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify on campaign creation
CREATE OR REPLACE FUNCTION public.notify_campaign_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, reference_id)
  VALUES (
    'campaign_created',
    'New Campaign Created',
    'Campaign "' || NEW.name || '" for ' || NEW.customer || ' has been created.',
    NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_campaign_created
AFTER INSERT ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.notify_campaign_created();

-- Trigger: notify when a charger record is flagged as Critical
CREATE OR REPLACE FUNCTION public.notify_charger_critical()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Critical' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'Critical') THEN
    INSERT INTO public.notifications (type, title, message, reference_id)
    VALUES (
      'charger_critical',
      'Charger Flagged Critical',
      'Charger ' || COALESCE(NEW.station_id, 'Unknown') || ' at ' || COALESCE(NEW.site_name, 'Unknown Site') || ' is now Critical.',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_charger_critical_insert
AFTER INSERT ON public.charger_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_charger_critical();

CREATE TRIGGER on_charger_critical_update
AFTER UPDATE ON public.charger_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_charger_critical();
