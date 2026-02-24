
-- Parts Inventory table
CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL UNIQUE,
  part_name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Electrical Components',
  charger_type text NOT NULL DEFAULT 'AC | Level 2',
  manufacturer text NOT NULL DEFAULT 'BTC',
  qty_in_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 5,
  reorder_quantity integer NOT NULL DEFAULT 10,
  location_bin text DEFAULT '',
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier text DEFAULT '',
  supplier_part_number text DEFAULT '',
  lead_time_days integer DEFAULT 7,
  last_price_update timestamptz DEFAULT now(),
  compatible_swis text[] DEFAULT '{}',
  compatible_models text[] DEFAULT '{}',
  weight_lbs numeric DEFAULT 0,
  dimensions text DEFAULT '',
  photo_url text,
  datasheet_url text,
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  usage_count_30d integer DEFAULT 0,
  last_used_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read parts" ON public.parts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert parts" ON public.parts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update parts" ON public.parts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete parts" ON public.parts FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock Movements table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'add',
  quantity integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  ticket_id text,
  purchase_order_id uuid,
  technician text,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  balance_after integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stock_movements" ON public.stock_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  order_date timestamptz DEFAULT now(),
  expected_delivery timestamptz,
  actual_delivery timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read purchase_orders" ON public.purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update purchase_orders" ON public.purchase_orders FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete purchase_orders" ON public.purchase_orders FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
