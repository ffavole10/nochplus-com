import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustomerRateSheet = {
  id: string;
  customer_name: string;
  name: string;
  description: string;
  effective_date: string | null;
  expiration_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RateSheetScope = {
  id: string;
  rate_sheet_id: string;
  scope_code: string;
  scope_name: string;
  exhibit: string;
  hours_to_complete: number | null;
  price_24hr: number | null;
  price_48hr: number | null;
  price_72hr: number | null;
  price_96hr: number | null;
  price_192hr: number | null;
  travel_note: string;
  requires_ev_rental: boolean;
  sort_order: number;
};

export type RateSheetTravelFee = {
  id: string;
  rate_sheet_id: string;
  fee_type: string;
  label: string;
  rate: number;
  unit: string;
  threshold: number | null;
  notes: string;
  sort_order: number;
};

export type RateSheetVolumeDiscount = {
  id: string;
  rate_sheet_id: string;
  discount_type: string;
  min_stations: number;
  max_stations: number | null;
  discount_percent: number;
};

// ─── List all rate sheets ───
export function useCustomerRateSheetsList() {
  return useQuery({
    queryKey: ["customer_rate_sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_rate_sheets" as any)
        .select("*")
        .order("customer_name");
      if (error) throw error;
      return (data || []) as unknown as CustomerRateSheet[];
    },
  });
}

// ─── Single rate sheet with all related data ───
export function useCustomerRateSheet(id: string | null) {
  return useQuery({
    queryKey: ["customer_rate_sheet", id],
    queryFn: async () => {
      if (!id) return null;
      const [sheetRes, scopesRes, feesRes, discountsRes] = await Promise.all([
        supabase.from("customer_rate_sheets" as any).select("*").eq("id", id).single(),
        supabase.from("rate_sheet_scopes" as any).select("*").eq("rate_sheet_id", id).order("sort_order"),
        supabase.from("rate_sheet_travel_fees" as any).select("*").eq("rate_sheet_id", id).order("sort_order"),
        supabase.from("rate_sheet_volume_discounts" as any).select("*").eq("rate_sheet_id", id).order("min_stations"),
      ]);
      if (sheetRes.error) throw sheetRes.error;
      return {
        sheet: sheetRes.data as unknown as CustomerRateSheet,
        scopes: (scopesRes.data || []) as unknown as RateSheetScope[],
        travelFees: (feesRes.data || []) as unknown as RateSheetTravelFee[],
        volumeDiscounts: (discountsRes.data || []) as unknown as RateSheetVolumeDiscount[],
      };
    },
    enabled: !!id,
  });
}

// ─── Scope count per sheet ───
export function useRateSheetScopeCounts() {
  return useQuery({
    queryKey: ["rate_sheet_scope_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_sheet_scopes" as any)
        .select("rate_sheet_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      ((data || []) as any[]).forEach((r: any) => {
        counts[r.rate_sheet_id] = (counts[r.rate_sheet_id] || 0) + 1;
      });
      return counts;
    },
  });
}

// ─── Mutations ───
export function useCreateCustomerRateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sheet: Omit<CustomerRateSheet, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("customer_rate_sheets" as any)
        .insert(sheet as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CustomerRateSheet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheets"] });
      toast.success("Rate sheet created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCustomerRateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerRateSheet> & { id: string }) => {
      const { error } = await supabase
        .from("customer_rate_sheets" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheets"] });
      qc.invalidateQueries({ queryKey: ["customer_rate_sheet"] });
      toast.success("Rate sheet updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCustomerRateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_rate_sheets" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheets"] });
      toast.success("Rate sheet deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Scopes CRUD ───
export function useUpsertScopes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateSheetId, scopes }: { rateSheetId: string; scopes: Omit<RateSheetScope, "id">[] }) => {
      await supabase.from("rate_sheet_scopes" as any).delete().eq("rate_sheet_id", rateSheetId);
      if (scopes.length > 0) {
        const { error } = await supabase.from("rate_sheet_scopes" as any).insert(scopes as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheet"] });
      qc.invalidateQueries({ queryKey: ["rate_sheet_scope_counts"] });
      toast.success("Scopes saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Travel Fees CRUD ───
export function useUpsertTravelFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateSheetId, fees }: { rateSheetId: string; fees: Omit<RateSheetTravelFee, "id">[] }) => {
      await supabase.from("rate_sheet_travel_fees" as any).delete().eq("rate_sheet_id", rateSheetId);
      if (fees.length > 0) {
        const { error } = await supabase.from("rate_sheet_travel_fees" as any).insert(fees as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheet"] });
      toast.success("Travel fees saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Volume Discounts CRUD ───
export function useUpsertVolumeDiscounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateSheetId, discounts }: { rateSheetId: string; discounts: Omit<RateSheetVolumeDiscount, "id">[] }) => {
      await supabase.from("rate_sheet_volume_discounts" as any).delete().eq("rate_sheet_id", rateSheetId);
      if (discounts.length > 0) {
        const { error } = await supabase.from("rate_sheet_volume_discounts" as any).insert(discounts as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer_rate_sheet"] });
      toast.success("Volume discounts saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
