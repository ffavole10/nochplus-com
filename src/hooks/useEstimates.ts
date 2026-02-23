import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EstimateRecord {
  id: string;
  campaign_id: string;
  charger_record_id: string | null;
  ticket_id: string | null;
  station_id: string | null;
  site_name: string | null;
  customer_email: string | null;
  account_manager: string | null;
  line_items: any[];
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  notes: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimates(campaignId: string | null) {
  return useQuery({
    queryKey: ["estimates", campaignId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("estimates")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EstimateRecord[];
    },
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimate: Omit<EstimateRecord, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("estimates")
        .insert(estimate)
        .select()
        .single();

      if (error) throw error;
      return data as EstimateRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimates", data.campaign_id] });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<EstimateRecord, "id" | "created_at" | "updated_at">>) => {
      const { data, error } = await supabase
        .from("estimates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EstimateRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimates", data.campaign_id] });
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from("estimates").delete().eq("id", id);
      if (error) throw error;
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["estimates", campaignId] });
    },
  });
}
