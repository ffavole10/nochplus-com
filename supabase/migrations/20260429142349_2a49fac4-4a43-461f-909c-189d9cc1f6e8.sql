
-- Enum for charger-customer relationship roles
DO $$ BEGIN
  CREATE TYPE public.charger_relationship_type AS ENUM ('owner', 'cpo', 'cms', 'oem', 'service_partner');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Junction table: a charger can have multiple stakeholders (each in a role)
CREATE TABLE IF NOT EXISTS public.charger_customer_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES public.charger_records(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  relationship_type public.charger_relationship_type NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charger_id, customer_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_ccr_customer ON public.charger_customer_relationships(customer_id);
CREATE INDEX IF NOT EXISTS idx_ccr_charger ON public.charger_customer_relationships(charger_id);
CREATE INDEX IF NOT EXISTS idx_ccr_type ON public.charger_customer_relationships(relationship_type);

ALTER TABLE public.charger_customer_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view charger relationships"
  ON public.charger_customer_relationships FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert charger relationships"
  ON public.charger_customer_relationships FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update charger relationships"
  ON public.charger_customer_relationships FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete charger relationships"
  ON public.charger_customer_relationships FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Replace account_ops_snapshot view to use the junction table.
-- Combines legacy direct customer link (locations.customer_id) with new
-- charger-stakeholder relationships, so existing data continues to work.
DROP VIEW IF EXISTS public.account_ops_snapshot;

CREATE VIEW public.account_ops_snapshot
WITH (security_invoker = on) AS
WITH charger_scope AS (
  -- Chargers a customer is linked to via the junction table
  SELECT DISTINCT ccr.customer_id, cr.id AS charger_id, cr.station_id, cr.address, cr.city, cr.state, cr.zip
  FROM public.charger_customer_relationships ccr
  JOIN public.charger_records cr ON cr.id = ccr.charger_id
),
charger_agg AS (
  SELECT
    customer_id,
    COUNT(DISTINCT charger_id)::int AS charger_count,
    COUNT(DISTINCT NULLIF(TRIM(COALESCE(address,'') || '|' || COALESCE(city,'') || '|' || COALESCE(state,'')), '||'))::int AS sites_count
  FROM charger_scope
  GROUP BY customer_id
),
loc_agg AS (
  -- Legacy: locations directly attached to a customer
  SELECT customer_id,
         COUNT(*)::int AS sites_count,
         COALESCE(SUM(charger_count), 0)::int AS charger_count
  FROM public.locations GROUP BY customer_id
),
t30 AS (
  SELECT company_id AS customer_id, COUNT(*)::int AS incidents_30d
  FROM public.service_tickets
  WHERE created_at >= now() - interval '30 days' AND company_id IS NOT NULL
  GROUP BY company_id
),
rel AS (
  SELECT customer_id,
         array_agg(DISTINCT relationship_type::text) AS relationship_types,
         COUNT(*)::int AS relationship_count
  FROM public.charger_customer_relationships
  GROUP BY customer_id
)
SELECT
  c.id AS customer_id,
  GREATEST(COALESCE(charger_agg.charger_count, 0), COALESCE(loc_agg.charger_count, 0))::int AS charger_count,
  GREATEST(COALESCE(charger_agg.sites_count, 0), COALESCE(loc_agg.sites_count, 0))::int AS sites_count,
  COALESCE(t30.incidents_30d, 0)::int AS incidents_30d,
  CASE
    WHEN GREATEST(COALESCE(charger_agg.charger_count, 0), COALESCE(loc_agg.charger_count, 0)) = 0 THEN 100.0
    ELSE GREATEST(0::numeric, 100.0 - ((COALESCE(t30.incidents_30d, 0)::numeric
      / GREATEST(GREATEST(COALESCE(charger_agg.charger_count, 0), COALESCE(loc_agg.charger_count, 0)), 1)::numeric) * 5))
  END AS uptime_pct,
  COALESCE(t30.incidents_30d, 0)::int AS truck_rolls_30d,
  (COALESCE(t30.incidents_30d, 0) * 850)::numeric * 0.5 AS estimated_monthly_savings,
  COALESCE(rel.relationship_types, ARRAY[]::text[]) AS relationship_types,
  COALESCE(rel.relationship_count, 0) AS relationship_count
FROM public.customers c
LEFT JOIN charger_agg ON charger_agg.customer_id = c.id
LEFT JOIN loc_agg ON loc_agg.customer_id = c.id
LEFT JOIN t30 ON t30.customer_id = c.id
LEFT JOIN rel ON rel.customer_id = c.id;

GRANT SELECT ON public.account_ops_snapshot TO authenticated, anon;
