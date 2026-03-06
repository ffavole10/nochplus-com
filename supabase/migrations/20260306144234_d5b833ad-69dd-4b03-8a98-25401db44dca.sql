
-- Drop remaining public policies on rate_sheets
DROP POLICY IF EXISTS "Allow public read access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public insert access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public update access on rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Allow public delete access on rate_sheets" ON public.rate_sheets;

-- Drop remaining public policies on rate_sheet_items
DROP POLICY IF EXISTS "Allow public read access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public insert access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public update access on rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Allow public delete access on rate_sheet_items" ON public.rate_sheet_items;
