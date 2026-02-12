
-- Add a JSONB column to store the full campaign draft data (configuration, schedule, statistics)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS data jsonb;

-- Add status column for draft/active/completed tracking
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add user_id to track who created the campaign
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS user_id uuid;
