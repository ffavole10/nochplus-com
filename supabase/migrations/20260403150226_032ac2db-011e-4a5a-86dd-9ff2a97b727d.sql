
-- Migration 1: campaigns — Add customer_id FK
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE INDEX IF NOT EXISTS idx_campaigns_customer_id ON public.campaigns(customer_id);

UPDATE public.campaigns c
SET customer_id = cust.id
FROM public.customers cust
WHERE c.customer_id IS NULL
AND LOWER(TRIM(c.customer)) = LOWER(TRIM(cust.company));

-- Migration 2: campaign_escalations — Add technician_id FK
ALTER TABLE public.campaign_escalations
ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians(id);

UPDATE public.campaign_escalations ce
SET technician_id = t.id
FROM public.technicians t
WHERE ce.technician_id IS NULL
AND ce.assigned_to IS NOT NULL
AND LOWER(TRIM(ce.assigned_to)) = LOWER(TRIM(t.first_name || ' ' || t.last_name));

-- Migration 3: estimates — Add customer_id FK
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates(customer_id);

UPDATE public.estimates e
SET customer_id = cust.id
FROM public.customers cust
WHERE e.customer_id IS NULL
AND e.customer_name IS NOT NULL
AND LOWER(TRIM(e.customer_name)) = LOWER(TRIM(cust.company));

-- Migration 4a: customer_rate_sheets — Add customer_id FK
ALTER TABLE public.customer_rate_sheets
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE INDEX IF NOT EXISTS idx_customer_rate_sheets_customer_id ON public.customer_rate_sheets(customer_id);

UPDATE public.customer_rate_sheets crs
SET customer_id = cust.id
FROM public.customers cust
WHERE crs.customer_id IS NULL
AND LOWER(TRIM(crs.customer_name)) = LOWER(TRIM(cust.company));

-- Migration 4b: customer_rate_overrides — Add customer_id FK
ALTER TABLE public.customer_rate_overrides
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE INDEX IF NOT EXISTS idx_customer_rate_overrides_customer_id ON public.customer_rate_overrides(customer_id);

UPDATE public.customer_rate_overrides cro
SET customer_id = cust.id
FROM public.customers cust
WHERE cro.customer_id IS NULL
AND LOWER(TRIM(cro.customer_name)) = LOWER(TRIM(cust.company));

-- Migration 4c: rate_sheets — Add customer_id FK
ALTER TABLE public.rate_sheets
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE INDEX IF NOT EXISTS idx_rate_sheets_customer_id ON public.rate_sheets(customer_id);

UPDATE public.rate_sheets rs
SET customer_id = cust.id
FROM public.customers cust
WHERE rs.customer_id IS NULL
AND rs.customer IS NOT NULL
AND LOWER(TRIM(rs.customer)) = LOWER(TRIM(cust.company));

-- Migration 5: stock_movements — Add technician_id FK
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians(id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_technician_id ON public.stock_movements(technician_id);

UPDATE public.stock_movements sm
SET technician_id = t.id
FROM public.technicians t
WHERE sm.technician_id IS NULL
AND sm.technician IS NOT NULL
AND LOWER(TRIM(sm.technician)) = LOWER(TRIM(t.first_name || ' ' || t.last_name));

-- Migration 6: service_tickets — Add technician_id FK
ALTER TABLE public.service_tickets
ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.technicians(id);

CREATE INDEX IF NOT EXISTS idx_service_tickets_technician_id ON public.service_tickets(technician_id);
