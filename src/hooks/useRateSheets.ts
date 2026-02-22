import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RateSheetItem {
  id: string;
  rate_sheet_id: string;
  scope_code: string;
  scope_name: string;
  hours: number | null;
  rate_24h: number | null;
  rate_48h: number | null;
  rate_72h: number | null;
  rate_96h: number | null;
  rate_192h: number | null;
  notes: string | null;
  sort_order: number;
}

export interface RateSheet {
  id: string;
  customer: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: RateSheetItem[];
}

export function useRateSheets() {
  return useQuery({
    queryKey: ["rate-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_sheets")
        .select("*")
        .order("customer");

      if (error) throw error;
      return data as Omit<RateSheet, "items">[];
    },
  });
}

export function useRateSheet(customer: string | null) {
  return useQuery({
    queryKey: ["rate-sheet", customer],
    queryFn: async () => {
      if (!customer) return null;

      const { data: sheets, error: sheetError } = await supabase
        .from("rate_sheets")
        .select("*")
        .eq("customer", customer)
        .limit(1);

      if (sheetError) throw sheetError;
      if (!sheets || sheets.length === 0) return null;

      const sheet = sheets[0];

      const { data: items, error: itemsError } = await supabase
        .from("rate_sheet_items")
        .select("*")
        .eq("rate_sheet_id", sheet.id)
        .order("sort_order");

      if (itemsError) throw itemsError;

      return { ...sheet, items: items || [] } as RateSheet;
    },
    enabled: !!customer,
  });
}
