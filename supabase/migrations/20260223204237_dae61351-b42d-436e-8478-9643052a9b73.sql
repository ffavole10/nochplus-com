
-- Trigger: create notification when a new submission is inserted
CREATE OR REPLACE FUNCTION public.notify_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (title, message, type, reference_id)
  VALUES (
    'New Assessment Submission',
    'New submission from ' || NEW.full_name || ' (' || NEW.company_name || ') - ' || NEW.city || ', ' || NEW.state,
    'new_submission',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_submission_created
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_submission();

-- Trigger: create notification when a service ticket status changes (covers Service Desk)
-- We also want to ensure estimate approval notifications already work (they do via edge function).
-- Let's also add a trigger for when submission status changes to approved
CREATE OR REPLACE FUNCTION public.notify_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (title, message, type, reference_id)
    VALUES (
      'Submission Approved',
      'Submission from ' || NEW.full_name || ' (' || NEW.company_name || ') has been approved',
      'submission_approved',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_submission_status_change
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_submission_status_change();
