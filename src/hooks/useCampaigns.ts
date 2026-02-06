import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  name: string;
  customer: string;
  quarter: string | null;
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  total_chargers: number;
  total_serviced: number;
  optimal_count: number;
  degraded_count: number;
  critical_count: number;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface ChargerRecord {
  id: string;
  campaign_id: string;
  station_id: string;
  station_name: string | null;
  serial_number: string | null;
  model: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  start_date: string | null;
  max_power: number | null;
  site_name: string | null;
  serviced_qty: number;
  service_date: string | null;
  report_url: string | null;
  status: "Optimal" | "Degraded" | "Critical" | null;
  summary: string | null;
  power_cabinet_report_url: string | null;
  power_cabinet_status: string | null;
  power_cabinet_summary: string | null;
  service_required: number;
  ccs_cable_issue: boolean;
  chademo_cable_issue: boolean;
  screen_damage: boolean;
  cc_reader_issue: boolean;
  rfid_reader_issue: boolean;
  app_issue: boolean;
  holster_issue: boolean;
  other_issue: boolean;
  power_supply_issue: boolean;
  circuit_board_issue: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    enabled: !!id,
  });
}

export function useChargerRecords(campaignId: string | null) {
  return useQuery({
    queryKey: ["charger_records", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("charger_records")
        .select("*")
        .eq("campaign_id", campaignId);

      if (error) throw error;
      return data as ChargerRecord[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<Campaign, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useCreateChargerRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: Omit<ChargerRecord, "id" | "created_at">[]) => {
      const { data, error } = await supabase
        .from("charger_records")
        .insert(records)
        .select();

      if (error) throw error;
      return data as ChargerRecord[];
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["charger_records", variables[0].campaign_id] });
      }
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
