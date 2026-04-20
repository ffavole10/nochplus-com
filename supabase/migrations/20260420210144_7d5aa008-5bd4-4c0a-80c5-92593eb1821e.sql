-- Backfill assessment_status='assessed' for tickets whose submission already has a generated assessment report
WITH backfilled AS (
  UPDATE public.service_tickets st
  SET
    assessment_status = 'assessed',
    assessed_at = ar.created_at,
    assessed_by = NULL,
    updated_at = now()
  FROM public.assessment_reports ar
  WHERE ar.submission_id = st.submission_id
    AND st.assessment_status = 'pending_review'
  RETURNING st.id
)
INSERT INTO public.ticket_audit_log (ticket_id, action, performed_by, performed_by_name, notes)
SELECT id, 'assessed', NULL, 'System (backfill)', 'Backfilled from existing assessment_reports record'
FROM backfilled;