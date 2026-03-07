
-- ============================================================
-- 1. Role-gated RLS policies for admin/staff tables
-- Replace "auth.uid() IS NOT NULL" with role-based checks
-- using the existing has_role() function.
-- Staff roles: super_admin, admin, manager, employee
-- ============================================================

-- ESTIMATES
DROP POLICY IF EXISTS "Authenticated can read estimates" ON public.estimates;
DROP POLICY IF EXISTS "Authenticated can insert estimates" ON public.estimates;
DROP POLICY IF EXISTS "Authenticated can update estimates" ON public.estimates;
DROP POLICY IF EXISTS "Authenticated can delete estimates" ON public.estimates;

CREATE POLICY "Staff can read estimates" ON public.estimates FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert estimates" ON public.estimates FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update estimates" ON public.estimates FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can delete estimates" ON public.estimates FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);

-- RATE_CARDS
DROP POLICY IF EXISTS "Authenticated can read rate_cards" ON public.rate_cards;
DROP POLICY IF EXISTS "Authenticated can insert rate_cards" ON public.rate_cards;
DROP POLICY IF EXISTS "Authenticated can update rate_cards" ON public.rate_cards;
DROP POLICY IF EXISTS "Authenticated can delete rate_cards" ON public.rate_cards;

CREATE POLICY "Staff can read rate_cards" ON public.rate_cards FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_cards" ON public.rate_cards FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_cards" ON public.rate_cards FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_cards" ON public.rate_cards FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_CARD_ITEMS
DROP POLICY IF EXISTS "Authenticated can read rate_card_items" ON public.rate_card_items;
DROP POLICY IF EXISTS "Authenticated can insert rate_card_items" ON public.rate_card_items;
DROP POLICY IF EXISTS "Authenticated can update rate_card_items" ON public.rate_card_items;
DROP POLICY IF EXISTS "Authenticated can delete rate_card_items" ON public.rate_card_items;

CREATE POLICY "Staff can read rate_card_items" ON public.rate_card_items FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_card_items" ON public.rate_card_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_card_items" ON public.rate_card_items FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_card_items" ON public.rate_card_items FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- QUOTE_RULES
DROP POLICY IF EXISTS "Authenticated can read quote_rules" ON public.quote_rules;
DROP POLICY IF EXISTS "Authenticated can insert quote_rules" ON public.quote_rules;
DROP POLICY IF EXISTS "Authenticated can update quote_rules" ON public.quote_rules;
DROP POLICY IF EXISTS "Authenticated can delete quote_rules" ON public.quote_rules;

CREATE POLICY "Staff can read quote_rules" ON public.quote_rules FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert quote_rules" ON public.quote_rules FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update quote_rules" ON public.quote_rules FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete quote_rules" ON public.quote_rules FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Authenticated can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can delete customers" ON public.customers;

CREATE POLICY "Staff can read customers" ON public.customers FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert customers" ON public.customers FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update customers" ON public.customers FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete customers" ON public.customers FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- CONTACTS
DROP POLICY IF EXISTS "Authenticated can read contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated can delete contacts" ON public.contacts;

CREATE POLICY "Staff can read contacts" ON public.contacts FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert contacts" ON public.contacts FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update contacts" ON public.contacts FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete contacts" ON public.contacts FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- LOCATIONS
DROP POLICY IF EXISTS "Authenticated can read locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can update locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can delete locations" ON public.locations;

CREATE POLICY "Staff can read locations" ON public.locations FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert locations" ON public.locations FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update locations" ON public.locations FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete locations" ON public.locations FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- TECHNICIANS
DROP POLICY IF EXISTS "Authenticated can read technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated can insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated can update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated can delete technicians" ON public.technicians;

CREATE POLICY "Staff can read technicians" ON public.technicians FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert technicians" ON public.technicians FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update technicians" ON public.technicians FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete technicians" ON public.technicians FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notifications;

CREATE POLICY "Staff can read notifications" ON public.notifications FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update notifications" ON public.notifications FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);

-- CUSTOMER_RATE_OVERRIDES
DROP POLICY IF EXISTS "Authenticated can read customer_rate_overrides" ON public.customer_rate_overrides;
DROP POLICY IF EXISTS "Authenticated can insert customer_rate_overrides" ON public.customer_rate_overrides;
DROP POLICY IF EXISTS "Authenticated can update customer_rate_overrides" ON public.customer_rate_overrides;
DROP POLICY IF EXISTS "Authenticated can delete customer_rate_overrides" ON public.customer_rate_overrides;

CREATE POLICY "Staff can read customer_rate_overrides" ON public.customer_rate_overrides FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert customer_rate_overrides" ON public.customer_rate_overrides FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update customer_rate_overrides" ON public.customer_rate_overrides FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete customer_rate_overrides" ON public.customer_rate_overrides FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- CUSTOMER_RATE_SHEETS
DROP POLICY IF EXISTS "Authenticated can read customer_rate_sheets" ON public.customer_rate_sheets;
DROP POLICY IF EXISTS "Authenticated can insert customer_rate_sheets" ON public.customer_rate_sheets;
DROP POLICY IF EXISTS "Authenticated can update customer_rate_sheets" ON public.customer_rate_sheets;
DROP POLICY IF EXISTS "Authenticated can delete customer_rate_sheets" ON public.customer_rate_sheets;

CREATE POLICY "Staff can read customer_rate_sheets" ON public.customer_rate_sheets FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert customer_rate_sheets" ON public.customer_rate_sheets FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update customer_rate_sheets" ON public.customer_rate_sheets FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete customer_rate_sheets" ON public.customer_rate_sheets FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_SHEET_SCOPES
DROP POLICY IF EXISTS "Authenticated can read rate_sheet_scopes" ON public.rate_sheet_scopes;
DROP POLICY IF EXISTS "Authenticated can insert rate_sheet_scopes" ON public.rate_sheet_scopes;
DROP POLICY IF EXISTS "Authenticated can update rate_sheet_scopes" ON public.rate_sheet_scopes;
DROP POLICY IF EXISTS "Authenticated can delete rate_sheet_scopes" ON public.rate_sheet_scopes;

CREATE POLICY "Staff can read rate_sheet_scopes" ON public.rate_sheet_scopes FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_sheet_scopes" ON public.rate_sheet_scopes FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_sheet_scopes" ON public.rate_sheet_scopes FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_sheet_scopes" ON public.rate_sheet_scopes FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_SHEET_TRAVEL_FEES
DROP POLICY IF EXISTS "Authenticated can read rate_sheet_travel_fees" ON public.rate_sheet_travel_fees;
DROP POLICY IF EXISTS "Authenticated can insert rate_sheet_travel_fees" ON public.rate_sheet_travel_fees;
DROP POLICY IF EXISTS "Authenticated can update rate_sheet_travel_fees" ON public.rate_sheet_travel_fees;
DROP POLICY IF EXISTS "Authenticated can delete rate_sheet_travel_fees" ON public.rate_sheet_travel_fees;

CREATE POLICY "Staff can read rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_sheet_travel_fees" ON public.rate_sheet_travel_fees FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_SHEET_VOLUME_DISCOUNTS
DROP POLICY IF EXISTS "Authenticated can read rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts;
DROP POLICY IF EXISTS "Authenticated can insert rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts;
DROP POLICY IF EXISTS "Authenticated can update rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts;
DROP POLICY IF EXISTS "Authenticated can delete rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts;

CREATE POLICY "Staff can read rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_sheet_volume_discounts" ON public.rate_sheet_volume_discounts FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_SHEETS
DROP POLICY IF EXISTS "Authenticated can read rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Authenticated can insert rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Authenticated can update rate_sheets" ON public.rate_sheets;
DROP POLICY IF EXISTS "Authenticated can delete rate_sheets" ON public.rate_sheets;

CREATE POLICY "Staff can read rate_sheets" ON public.rate_sheets FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_sheets" ON public.rate_sheets FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_sheets" ON public.rate_sheets FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_sheets" ON public.rate_sheets FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- RATE_SHEET_ITEMS
DROP POLICY IF EXISTS "Authenticated can read rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Authenticated can insert rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Authenticated can update rate_sheet_items" ON public.rate_sheet_items;
DROP POLICY IF EXISTS "Authenticated can delete rate_sheet_items" ON public.rate_sheet_items;

CREATE POLICY "Staff can read rate_sheet_items" ON public.rate_sheet_items FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert rate_sheet_items" ON public.rate_sheet_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update rate_sheet_items" ON public.rate_sheet_items FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete rate_sheet_items" ON public.rate_sheet_items FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- Also tighten remaining tables that were listed: purchase_orders, parts, stock_movements, ai_agent_prompts, service_regions

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "Authenticated can read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated can delete purchase_orders" ON public.purchase_orders;

CREATE POLICY "Staff can read purchase_orders" ON public.purchase_orders FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update purchase_orders" ON public.purchase_orders FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete purchase_orders" ON public.purchase_orders FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- PARTS
DROP POLICY IF EXISTS "Authenticated can read parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated can update parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated can delete parts" ON public.parts;

CREATE POLICY "Staff can read parts" ON public.parts FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert parts" ON public.parts FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update parts" ON public.parts FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete parts" ON public.parts FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Authenticated can read stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated can insert stock_movements" ON public.stock_movements;

CREATE POLICY "Staff can read stock_movements" ON public.stock_movements FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);

-- AI_AGENT_PROMPTS
DROP POLICY IF EXISTS "Authenticated can read ai_agent_prompts" ON public.ai_agent_prompts;
DROP POLICY IF EXISTS "Authenticated can insert ai_agent_prompts" ON public.ai_agent_prompts;
DROP POLICY IF EXISTS "Authenticated can update ai_agent_prompts" ON public.ai_agent_prompts;
DROP POLICY IF EXISTS "Authenticated can delete ai_agent_prompts" ON public.ai_agent_prompts;

CREATE POLICY "Staff can read ai_agent_prompts" ON public.ai_agent_prompts FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert ai_agent_prompts" ON public.ai_agent_prompts FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admin can update ai_agent_prompts" ON public.ai_agent_prompts FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admin can delete ai_agent_prompts" ON public.ai_agent_prompts FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- SERVICE_REGIONS
DROP POLICY IF EXISTS "Authenticated can read service_regions" ON public.service_regions;
DROP POLICY IF EXISTS "Authenticated can insert service_regions" ON public.service_regions;
DROP POLICY IF EXISTS "Authenticated can update service_regions" ON public.service_regions;
DROP POLICY IF EXISTS "Authenticated can delete service_regions" ON public.service_regions;

CREATE POLICY "Staff can read service_regions" ON public.service_regions FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can insert service_regions" ON public.service_regions FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can update service_regions" ON public.service_regions FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admin can delete service_regions" ON public.service_regions FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- Also tighten submissions (currently staff can read/update/delete, keep that but role-gated)
DROP POLICY IF EXISTS "Staff can read submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated can update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated can delete submissions" ON public.submissions;

CREATE POLICY "Staff can read submissions" ON public.submissions FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Staff can update submissions" ON public.submissions FOR UPDATE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);
CREATE POLICY "Admin can delete submissions" ON public.submissions FOR DELETE USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);

-- CHARGER_SUBMISSIONS (same pattern)
DROP POLICY IF EXISTS "Staff can read charger submissions" ON public.charger_submissions;

CREATE POLICY "Staff can read charger_submissions" ON public.charger_submissions FOR SELECT USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'employee')
);

-- 2. Drop unrestricted INSERT policy on submission-photos storage bucket
DROP POLICY IF EXISTS "Anyone can upload submission photos" ON storage.objects;
