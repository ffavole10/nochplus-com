
-- Recreate triggers for submission notifications
DROP TRIGGER IF EXISTS on_submission_created ON public.submissions;
CREATE TRIGGER on_submission_created
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_submission();

DROP TRIGGER IF EXISTS on_submission_status_change ON public.submissions;
CREATE TRIGGER on_submission_status_change
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_submission_status_change();

-- Also ensure campaign triggers exist
DROP TRIGGER IF EXISTS on_campaign_created ON public.campaigns;
CREATE TRIGGER on_campaign_created
AFTER INSERT ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.notify_campaign_created();

DROP TRIGGER IF EXISTS on_charger_critical ON public.charger_records;
CREATE TRIGGER on_charger_critical
AFTER INSERT OR UPDATE ON public.charger_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_charger_critical();
