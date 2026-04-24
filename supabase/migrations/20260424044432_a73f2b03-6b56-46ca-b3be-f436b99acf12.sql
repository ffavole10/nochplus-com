-- =========================================================================
-- PHASE 1: Field Capture schema, RLS, and roles
-- =========================================================================

-- 1. Extend app_role enum with new roles needed for Field Capture
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'account_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing';
