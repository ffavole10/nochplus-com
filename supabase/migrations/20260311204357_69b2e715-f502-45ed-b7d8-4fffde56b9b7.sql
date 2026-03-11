
-- OCPP Events table
CREATE TABLE public.ocpp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  error_code text NOT NULL DEFAULT '',
  error_description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  ocpp_status text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_type text,
  max_action_taken text,
  max_confidence numeric,
  ticket_id uuid REFERENCES public.service_tickets(id) ON DELETE SET NULL
);

ALTER TABLE public.ocpp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access ocpp_events SELECT" ON public.ocpp_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access ocpp_events INSERT" ON public.ocpp_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access ocpp_events UPDATE" ON public.ocpp_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access ocpp_events DELETE" ON public.ocpp_events FOR DELETE TO authenticated USING (true);

-- Enable realtime for ocpp_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocpp_events;

-- Charger Health Scores table
CREATE TABLE public.charger_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid,
  cvs_score integer NOT NULL DEFAULT 0,
  session_completion_rate numeric DEFAULT 0,
  error_recurrence_index numeric DEFAULT 0,
  thermal_stress_index numeric DEFAULT 0,
  connector_wear_score numeric DEFAULT 0,
  communication_score numeric DEFAULT 0,
  firmware_currency_score integer DEFAULT 100,
  predicted_failure_days integer DEFAULT 365,
  last_calculated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charger_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access charger_health SELECT" ON public.charger_health_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access charger_health INSERT" ON public.charger_health_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access charger_health UPDATE" ON public.charger_health_scores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access charger_health DELETE" ON public.charger_health_scores FOR DELETE TO authenticated USING (true);

-- Environmental Correlations table
CREATE TABLE public.environmental_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  heat_vulnerability_index numeric DEFAULT 0,
  coastal_corrosion_risk numeric DEFAULT 0,
  storm_impact_score numeric DEFAULT 0,
  altitude_modifier numeric DEFAULT 0,
  uv_exposure_index numeric DEFAULT 0,
  seasonal_drift_active boolean DEFAULT false,
  last_weather_event_at timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.environmental_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access env_corr SELECT" ON public.environmental_correlations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full access env_corr INSERT" ON public.environmental_correlations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated full access env_corr UPDATE" ON public.environmental_correlations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated full access env_corr DELETE" ON public.environmental_correlations FOR DELETE TO authenticated USING (true);
