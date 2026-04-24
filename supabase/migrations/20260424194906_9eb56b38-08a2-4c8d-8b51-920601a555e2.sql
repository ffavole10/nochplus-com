-- Phase 1: NOCH Pro performance dashboard tables

-- Achievement type enum
CREATE TYPE public.achievement_type AS ENUM (
  'first_job','ten_jobs','fifty_jobs','century_club','five_hundred',
  'first_charger','ten_chargers','fifty_chargers','charger_variety','charger_master',
  'photo_documentarian','photo_master','photo_legend',
  'first_swap','swap_specialist','swap_master',
  'week_of_excellence','month_of_excellence','speed_demon','under_budget',
  'thorough_documenter','detailed_writer',
  'early_adopter','perfect_month','versatility'
);

-- Daily performance snapshots
CREATE TABLE public.technician_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  jobs_completed_today INTEGER NOT NULL DEFAULT 0,
  jobs_on_time_today INTEGER NOT NULL DEFAULT 0,
  chargers_captured_today INTEGER NOT NULL DEFAULT 0,
  photos_uploaded_today INTEGER NOT NULL DEFAULT 0,
  parts_swaps_today INTEGER NOT NULL DEFAULT 0,
  total_minutes_worked_today INTEGER NOT NULL DEFAULT 0,
  total_minutes_allocated_today INTEGER NOT NULL DEFAULT 0,
  efficiency_rating NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (technician_id, snapshot_date)
);
CREATE INDEX idx_tps_tech_date ON public.technician_performance_snapshots(technician_id, snapshot_date DESC);

ALTER TABLE public.technician_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techs view own snapshots" ON public.technician_performance_snapshots
  FOR SELECT USING (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Techs insert own snapshots" ON public.technician_performance_snapshots
  FOR INSERT WITH CHECK (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Techs update own snapshots" ON public.technician_performance_snapshots
  FOR UPDATE USING (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

-- Achievements
CREATE TABLE public.technician_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL,
  achievement_type public.achievement_type NOT NULL,
  achievement_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (technician_id, achievement_type)
);
CREATE INDEX idx_ta_tech ON public.technician_achievements(technician_id, unlocked_at DESC);

ALTER TABLE public.technician_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techs view own achievements" ON public.technician_achievements
  FOR SELECT USING (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Techs insert own achievements" ON public.technician_achievements
  FOR INSERT WITH CHECK (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

-- Stats cache
CREATE TABLE public.technician_stats_cache (
  technician_id UUID PRIMARY KEY,
  total_jobs_completed INTEGER NOT NULL DEFAULT 0,
  total_chargers_captured INTEGER NOT NULL DEFAULT 0,
  total_photos_uploaded INTEGER NOT NULL DEFAULT 0,
  total_parts_swaps INTEGER NOT NULL DEFAULT 0,
  total_minutes_worked INTEGER NOT NULL DEFAULT 0,
  lifetime_efficiency_rating NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_month_jobs INTEGER NOT NULL DEFAULT 0,
  current_month_on_time INTEGER NOT NULL DEFAULT 0,
  current_month_efficiency NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_30_days_efficiency NUMERIC(5,2) NOT NULL DEFAULT 0,
  previous_30_days_efficiency NUMERIC(5,2) NOT NULL DEFAULT 0,
  efficiency_trend NUMERIC(5,2) NOT NULL DEFAULT 0,
  longest_on_time_streak INTEGER NOT NULL DEFAULT 0,
  current_on_time_streak INTEGER NOT NULL DEFAULT 0,
  fastest_job_minutes INTEGER,
  noch_pro_score INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  reliability_score INTEGER NOT NULL DEFAULT 0,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  previous_noch_pro_score INTEGER NOT NULL DEFAULT 0,
  most_chargers_one_day INTEGER NOT NULL DEFAULT 0,
  best_efficiency_month NUMERIC(5,2) NOT NULL DEFAULT 0,
  most_photos_one_job INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technician_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techs view own stats" ON public.technician_stats_cache
  FOR SELECT USING (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Techs upsert own stats" ON public.technician_stats_cache
  FOR INSERT WITH CHECK (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));

CREATE POLICY "Techs update own stats" ON public.technician_stats_cache
  FOR UPDATE USING (auth.uid() = technician_id OR public.is_field_capture_admin(auth.uid()));
