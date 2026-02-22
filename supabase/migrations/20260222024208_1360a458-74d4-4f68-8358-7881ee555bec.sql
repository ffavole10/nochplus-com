ALTER TABLE public.estimates ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE public.estimates ALTER COLUMN campaign_id SET DEFAULT NULL;