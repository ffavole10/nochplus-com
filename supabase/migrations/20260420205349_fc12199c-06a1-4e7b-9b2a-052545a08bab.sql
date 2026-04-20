
-- 1. Assessment status enum
DO $$ BEGIN
  CREATE TYPE public.ticket_assessment_status AS ENUM ('pending_review', 'assessed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Extend service_tickets with lifecycle columns
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS assessment_status public.ticket_assessment_status NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS assessment_data jsonb,
  ADD COLUMN IF NOT EXISTS swi_match_data jsonb,
  ADD COLUMN IF NOT EXISTS assessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS assessed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS revert_reason text,
  ADD COLUMN IF NOT EXISTS sent_to_customer_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_to_customer_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS sent_to_customer_email text;

-- 3. Audit log table
CREATE TABLE IF NOT EXISTS public.ticket_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_name text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_ticket_audit_log_ticket_id ON public.ticket_audit_log(ticket_id, performed_at DESC);

ALTER TABLE public.ticket_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read ticket audit log" ON public.ticket_audit_log;
CREATE POLICY "Staff can read ticket audit log"
  ON public.ticket_audit_log FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'employee'::app_role)
  );

-- Inserts only happen via SECURITY DEFINER RPCs, so we deny direct inserts
DROP POLICY IF EXISTS "Audit log inserts via RPC only" ON public.ticket_audit_log;
CREATE POLICY "Audit log inserts via RPC only"
  ON public.ticket_audit_log FOR INSERT
  WITH CHECK (false);

-- 4. Helper: has any of the privileged roles
CREATE OR REPLACE FUNCTION public.is_ticket_overrider(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'super_admin'::app_role) OR
    has_role(_user_id, 'admin'::app_role) OR
    has_role(_user_id, 'manager'::app_role)
$$;

-- 5. RPCs

-- 5a. Approve & record assessment results (writes assessment + sets status atomically)
CREATE OR REPLACE FUNCTION public.approve_and_run_assessment(
  _ticket_id uuid,
  _assessment_data jsonb,
  _swi_match_data jsonb,
  _notes text DEFAULT NULL,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.assessment_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Ticket already %', _row.assessment_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE service_tickets SET
    assessment_status = 'assessed',
    assessment_data = _assessment_data,
    swi_match_data = _swi_match_data,
    assessed_at = now(),
    assessed_by = _uid,
    staff_notes = COALESCE(_notes, staff_notes),
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name, notes)
  VALUES (_ticket_id, 'assessed', _uid, _performer_name, _notes);

  RETURN _row;
END $$;

-- 5b. Re-run assessment (privileged) - resets send state
CREATE OR REPLACE FUNCTION public.rerun_assessment(
  _ticket_id uuid,
  _assessment_data jsonb,
  _swi_match_data jsonb,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_ticket_overrider(_uid) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.assessment_status <> 'assessed' THEN
    RAISE EXCEPTION 'Can only re-run assessed tickets (current: %)', _row.assessment_status;
  END IF;

  UPDATE service_tickets SET
    assessment_data = _assessment_data,
    swi_match_data = _swi_match_data,
    assessed_at = now(),
    assessed_by = _uid,
    sent_to_customer_at = NULL,
    sent_to_customer_by = NULL,
    sent_to_customer_email = NULL,
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name)
  VALUES (_ticket_id, 're_assessed', _uid, _performer_name);

  RETURN _row;
END $$;

-- 5c. Reject ticket (any staff, only when pending_review)
CREATE OR REPLACE FUNCTION public.reject_ticket(
  _ticket_id uuid,
  _reason text,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason required';
  END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.assessment_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Can only reject pending tickets (current: %)', _row.assessment_status;
  END IF;

  UPDATE service_tickets SET
    assessment_status = 'rejected',
    rejected_at = now(),
    rejected_by = _uid,
    rejection_reason = _reason,
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name, notes)
  VALUES (_ticket_id, 'rejected', _uid, _performer_name, _reason);

  RETURN _row;
END $$;

-- 5d. Revert rejection (privileged)
CREATE OR REPLACE FUNCTION public.revert_rejection(
  _ticket_id uuid,
  _revert_reason text,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_ticket_overrider(_uid) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  IF _revert_reason IS NULL OR length(trim(_revert_reason)) = 0 THEN
    RAISE EXCEPTION 'Revert reason required';
  END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.assessment_status <> 'rejected' THEN
    RAISE EXCEPTION 'Can only revert rejected tickets (current: %)', _row.assessment_status;
  END IF;

  UPDATE service_tickets SET
    assessment_status = 'pending_review',
    rejected_at = NULL,
    rejected_by = NULL,
    rejection_reason = NULL,
    reverted_at = now(),
    reverted_by = _uid,
    revert_reason = _revert_reason,
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name, notes)
  VALUES (_ticket_id, 'reverted', _uid, _performer_name, _revert_reason);

  RETURN _row;
END $$;

-- 5e. Mark assessment as sent to customer (first send only)
CREATE OR REPLACE FUNCTION public.mark_assessment_sent(
  _ticket_id uuid,
  _email text,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.assessment_status <> 'assessed' THEN
    RAISE EXCEPTION 'Ticket is not assessed (current: %)', _row.assessment_status;
  END IF;

  IF _row.sent_to_customer_at IS NOT NULL THEN
    RAISE EXCEPTION 'Already sent on % to %', _row.sent_to_customer_at, _row.sent_to_customer_email
      USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE service_tickets SET
    sent_to_customer_at = now(),
    sent_to_customer_by = _uid,
    sent_to_customer_email = _email,
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name, metadata)
  VALUES (_ticket_id, 'sent_to_customer', _uid, _performer_name, jsonb_build_object('email', _email));

  RETURN _row;
END $$;

-- 5f. Resend (privileged) - requires note
CREATE OR REPLACE FUNCTION public.resend_assessment(
  _ticket_id uuid,
  _email text,
  _note text,
  _performer_name text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.service_tickets;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_ticket_overrider(_uid) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  IF _note IS NULL OR length(trim(_note)) = 0 THEN
    RAISE EXCEPTION 'Resend justification required';
  END IF;

  SELECT * INTO _row FROM service_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  IF _row.sent_to_customer_at IS NULL THEN
    RAISE EXCEPTION 'Cannot resend — initial send has not occurred';
  END IF;

  UPDATE service_tickets SET
    sent_to_customer_at = now(),
    sent_to_customer_by = _uid,
    sent_to_customer_email = _email,
    updated_at = now()
  WHERE id = _ticket_id
  RETURNING * INTO _row;

  INSERT INTO ticket_audit_log (ticket_id, action, performed_by, performed_by_name, notes, metadata)
  VALUES (_ticket_id, 'resent_to_customer', _uid, _performer_name, _note, jsonb_build_object('email', _email));

  RETURN _row;
END $$;

-- 6. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_audit_log;
ALTER TABLE public.service_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_audit_log REPLICA IDENTITY FULL;
