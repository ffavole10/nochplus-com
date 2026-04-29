
-- Ticket invoices table for Step 10 closeout (Neural OS draft + manual upload paths)
CREATE TABLE IF NOT EXISTS public.ticket_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_db_id UUID,
  ticket_text_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  total_amount NUMERIC(12,2),
  invoice_date DATE,
  source TEXT NOT NULL CHECK (source IN ('neural_os','uploaded')),
  source_label TEXT,
  status TEXT NOT NULL DEFAULT 'attached' CHECK (status IN ('draft','attached')),
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  pdf_path TEXT,
  bill_to JSONB,
  tax_rate NUMERIC(6,4) DEFAULT 0,
  subtotal NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  confidence_score TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_invoices_ticket_text_id_idx ON public.ticket_invoices(ticket_text_id);
CREATE INDEX IF NOT EXISTS ticket_invoices_ticket_db_id_idx ON public.ticket_invoices(ticket_db_id);

ALTER TABLE public.ticket_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ticket invoices"
  ON public.ticket_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ticket invoices"
  ON public.ticket_invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ticket invoices"
  ON public.ticket_invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ticket invoices"
  ON public.ticket_invoices FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_ticket_invoices_updated_at
  BEFORE UPDATE ON public.ticket_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for uploaded invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-invoices', 'ticket-invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read ticket invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'ticket-invoices');

CREATE POLICY "Authenticated upload ticket invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ticket-invoices' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update ticket invoices"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ticket-invoices' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete ticket invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ticket-invoices' AND auth.uid() IS NOT NULL);
