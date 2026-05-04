
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.weekly_review_status AS ENUM ('pre_meeting','open','closed','skipped','missed','pending_close');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekly_review_skip_reason AS ENUM ('holiday','trade_show','team_travel','sprint_week','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekly_review_note_type AS ENUM ('update','decision','action_item','risk','need');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekly_review_link_type AS ENUM ('deal','strategy','account','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekly_review_action_status AS ENUM ('open','complete','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ weekly_reviews ============
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number int NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.weekly_review_status NOT NULL DEFAULT 'pre_meeting',
  closed_at timestamptz,
  closed_by text,
  skip_reason public.weekly_review_skip_reason,
  skip_reason_notes text,
  skipped_at timestamptz,
  skipped_by text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_year_week ON public.weekly_reviews(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_status ON public.weekly_reviews(status);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth view weekly_reviews" ON public.weekly_reviews;
CREATE POLICY "auth view weekly_reviews" ON public.weekly_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert weekly_reviews" ON public.weekly_reviews;
CREATE POLICY "auth insert weekly_reviews" ON public.weekly_reviews FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth update weekly_reviews" ON public.weekly_reviews;
CREATE POLICY "auth update weekly_reviews" ON public.weekly_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER weekly_reviews_set_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ weekly_review_notes ============
CREATE TABLE IF NOT EXISTS public.weekly_review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_review_id uuid NOT NULL REFERENCES public.weekly_reviews(id) ON DELETE CASCADE,
  note_type public.weekly_review_note_type NOT NULL,
  note_text text NOT NULL,
  linked_to_type public.weekly_review_link_type NOT NULL DEFAULT 'none',
  linked_to_id uuid,
  owner text,
  due_date date,
  action_status public.weekly_review_action_status,
  author text NOT NULL,
  author_user_id uuid,
  is_pre_meeting boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrn_review ON public.weekly_review_notes(weekly_review_id);
CREATE INDEX IF NOT EXISTS idx_wrn_link ON public.weekly_review_notes(linked_to_type, linked_to_id);
CREATE INDEX IF NOT EXISTS idx_wrn_author ON public.weekly_review_notes(author, created_at DESC);

ALTER TABLE public.weekly_review_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth view wrn" ON public.weekly_review_notes;
CREATE POLICY "auth view wrn" ON public.weekly_review_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert wrn" ON public.weekly_review_notes;
CREATE POLICY "auth insert wrn" ON public.weekly_review_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth update wrn" ON public.weekly_review_notes;
CREATE POLICY "auth update wrn" ON public.weekly_review_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth delete wrn" ON public.weekly_review_notes;
CREATE POLICY "auth delete wrn" ON public.weekly_review_notes FOR DELETE TO authenticated USING (true);

-- Lock-edit guard: once locked, only original author can edit within 24h of review close
CREATE OR REPLACE FUNCTION public.weekly_review_note_lock_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_closed_at timestamptz;
BEGIN
  IF OLD.locked = true THEN
    SELECT closed_at INTO parent_closed_at FROM public.weekly_reviews WHERE id = OLD.weekly_review_id;
    -- Allow edits only by original author within 24 hours of close
    IF (auth.uid() IS NULL OR OLD.author_user_id IS DISTINCT FROM auth.uid())
       OR parent_closed_at IS NULL
       OR parent_closed_at < now() - interval '24 hours' THEN
      -- Allow only system field updates (locked flag itself)
      IF NEW.note_text IS DISTINCT FROM OLD.note_text
         OR NEW.note_type IS DISTINCT FROM OLD.note_type
         OR NEW.owner IS DISTINCT FROM OLD.owner
         OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        RAISE EXCEPTION 'Note is locked and cannot be edited';
      END IF;
    ELSE
      NEW.edited_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wrn_lock_guard ON public.weekly_review_notes;
CREATE TRIGGER wrn_lock_guard
  BEFORE UPDATE ON public.weekly_review_notes
  FOR EACH ROW EXECUTE FUNCTION public.weekly_review_note_lock_guard();

-- ============ Helper: ISO week math + get/create current ============
CREATE OR REPLACE FUNCTION public.get_or_create_current_weekly_review()
RETURNS public.weekly_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  monday date;
  sunday date;
  iso_week int;
  iso_year int;
  row public.weekly_reviews;
  initial_status public.weekly_review_status;
BEGIN
  -- Monday of current ISO week
  monday := today - ((EXTRACT(ISODOW FROM today)::int - 1));
  sunday := monday + 6;
  iso_week := EXTRACT(WEEK FROM monday)::int;
  iso_year := EXTRACT(ISOYEAR FROM monday)::int;

  SELECT * INTO row FROM public.weekly_reviews WHERE week_number = iso_week AND year = iso_year;
  IF FOUND THEN
    RETURN row;
  END IF;

  -- Initial status: open if it's Mon-Sun (we're inside the week), else pre_meeting
  initial_status := 'open';

  INSERT INTO public.weekly_reviews (week_number, year, start_date, end_date, status)
  VALUES (iso_week, iso_year, monday, sunday, initial_status)
  RETURNING * INTO row;

  RETURN row;
END $$;

-- ============ Auto-advance statuses based on day-of-week ============
CREATE OR REPLACE FUNCTION public.auto_advance_weekly_review_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  dow int := EXTRACT(ISODOW FROM today)::int;
BEGIN
  -- pre_meeting -> open on Monday
  UPDATE public.weekly_reviews
  SET status = 'open'
  WHERE status = 'pre_meeting' AND start_date <= today;

  -- open -> pending_close starting Tuesday of the same week
  UPDATE public.weekly_reviews
  SET status = 'pending_close'
  WHERE status = 'open' AND end_date < today;

  -- pending_close -> missed once we're 2+ days past the week's end
  UPDATE public.weekly_reviews
  SET status = 'missed'
  WHERE status = 'pending_close' AND end_date < today - interval '2 days';
END $$;

-- ============ Close ============
CREATE OR REPLACE FUNCTION public.close_weekly_review(_id uuid, _closed_by text DEFAULT NULL)
RETURNS public.weekly_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.weekly_reviews;
  n_total int; n_update int; n_decision int; n_action int; n_risk int; n_need int;
  n_owners int;
  earliest_due date;
  decisions_text text;
  summary_text text;
BEGIN
  SELECT * INTO row FROM public.weekly_reviews WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Weekly review not found'; END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE note_type='update'),
    count(*) FILTER (WHERE note_type='decision'),
    count(*) FILTER (WHERE note_type='action_item'),
    count(*) FILTER (WHERE note_type='risk'),
    count(*) FILTER (WHERE note_type='need'),
    count(DISTINCT owner) FILTER (WHERE note_type='action_item' AND owner IS NOT NULL),
    min(due_date) FILTER (WHERE note_type='action_item')
  INTO n_total, n_update, n_decision, n_action, n_risk, n_need, n_owners, earliest_due
  FROM public.weekly_review_notes WHERE weekly_review_id = _id;

  SELECT string_agg('- ' || left(note_text, 140), E'\n')
  INTO decisions_text
  FROM (
    SELECT note_text FROM public.weekly_review_notes
    WHERE weekly_review_id = _id AND note_type='decision'
    ORDER BY created_at ASC LIMIT 3
  ) d;

  summary_text := format(
    E'Week %s · %s\n%s notes captured: %s updates · %s decisions · %s action items · %s risks · %s needs',
    row.week_number, to_char(row.start_date, 'Mon DD, YYYY'),
    n_total, n_update, n_decision, n_action, n_risk, n_need
  );
  IF decisions_text IS NOT NULL THEN
    summary_text := summary_text || E'\n\nTop decisions:\n' || decisions_text;
  END IF;
  IF n_action > 0 THEN
    summary_text := summary_text || format(E'\n\nAction items assigned: %s with %s unique owners', n_action, COALESCE(n_owners,0));
    IF earliest_due IS NOT NULL THEN
      summary_text := summary_text || format(E'\nEarliest due date: %s', to_char(earliest_due, 'Mon DD, YYYY'));
    END IF;
  END IF;
  summary_text := summary_text || format(E'\n\nClosed by %s on %s', COALESCE(_closed_by,'(unknown)'), to_char(now(), 'Mon DD, YYYY HH24:MI'));

  UPDATE public.weekly_reviews
  SET status='closed', closed_at=now(), closed_by=_closed_by, summary=summary_text, updated_at=now()
  WHERE id=_id RETURNING * INTO row;

  UPDATE public.weekly_review_notes SET locked=true WHERE weekly_review_id=_id AND locked=false;

  RETURN row;
END $$;

-- ============ Skip ============
CREATE OR REPLACE FUNCTION public.skip_weekly_review(
  _id uuid, _reason public.weekly_review_skip_reason, _notes text DEFAULT NULL, _skipped_by text DEFAULT NULL
)
RETURNS public.weekly_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE row public.weekly_reviews;
BEGIN
  UPDATE public.weekly_reviews
  SET status='skipped', skip_reason=_reason, skip_reason_notes=_notes,
      skipped_at=now(), skipped_by=_skipped_by, updated_at=now()
  WHERE id=_id RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Weekly review not found'; END IF;
  RETURN row;
END $$;
