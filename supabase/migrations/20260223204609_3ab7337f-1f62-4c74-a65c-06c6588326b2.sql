
CREATE OR REPLACE FUNCTION public.notify_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (title, message, type, reference_id)
  VALUES (
    'New Assessment Submission',
    'New submission from ' || NEW.full_name || ' (' || NEW.company_name || ') - ' || NEW.city || ', ' || NEW.state,
    'new_submission',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (title, message, type, reference_id)
    VALUES (
      'Submission Approved',
      'Submission from ' || NEW.full_name || ' (' || NEW.company_name || ') has been approved',
      'submission_approved',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
