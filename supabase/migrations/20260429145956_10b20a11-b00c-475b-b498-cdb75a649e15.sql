-- Account source enum
DO $$ BEGIN
  CREATE TYPE public.account_source AS ENUM ('inbound','outbound','referral','conference','investor_network','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Relationship type enum
DO $$ BEGIN
  CREATE TYPE public.account_relationship_type AS ENUM ('partner','customer','prospect','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS hq_city text,
  ADD COLUMN IF NOT EXISTS hq_region text,
  ADD COLUMN IF NOT EXISTS source public.account_source,
  ADD COLUMN IF NOT EXISTS relationship_type public.account_relationship_type,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_confirmed_distinct_of uuid[];

-- Trigram index for fast similarity / fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS customers_company_trgm_idx ON public.customers USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers (lower(email));
CREATE INDEX IF NOT EXISTS customers_domain_idx ON public.customers (lower(domain));