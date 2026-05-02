-- Drop old check first so updates can use new values
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- Migrate data
UPDATE public.contacts SET contact_type = 'technical_buyer'      WHERE contact_type = 'technical';
UPDATE public.contacts SET contact_type = 'operations_contact'   WHERE contact_type = 'operations';
UPDATE public.contacts SET contact_type = 'billing_procurement'  WHERE contact_type = 'billing';
UPDATE public.contacts SET contact_type = 'champion'             WHERE contact_type = 'other' OR contact_type IS NULL;

-- Re-add check with new allowed values
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_contact_type_check
  CHECK (contact_type IN ('primary','decision_maker','champion','technical_buyer','operations_contact','billing_procurement'));

-- Update default
ALTER TABLE public.contacts ALTER COLUMN contact_type SET DEFAULT 'champion';