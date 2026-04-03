import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Field Reports ───
export interface FieldReport {
  id: string;
  campaign_id: string;
  technician_id: string | null;
  site_name: string;
  charger_ids: string[];
  status: string;
  work_performed: string;
  arrival_time: string | null;
  departure_time: string | null;
  hours_logged: number;
  notes: string;
  photo_urls: string[];
  is_unscheduled: boolean;
  created_at: string;
  updated_at: string;
}

export function useFieldReports(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign_field_reports", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_field_reports")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FieldReport[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateFieldReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: Omit<FieldReport, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("campaign_field_reports")
        .insert(report as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["campaign_field_reports", v.campaign_id] });
      qc.invalidateQueries({ queryKey: ["campaign_chargers", v.campaign_id] });
    },
  });
}

// ─── Escalations ───
export interface Escalation {
  id: string;
  campaign_id: string;
  site_name: string;
  charger_id: string;
  severity: string;
  issue_type: string;
  description: string;
  assigned_to: string;
  status: string;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
}

export function useEscalations(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign_escalations", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_escalations")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Escalation[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (esc: Omit<Escalation, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("campaign_escalations")
        .insert(esc as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["campaign_escalations", v.campaign_id] });
    },
  });
}

export function useUpdateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campaignId, ...updates }: { id: string; campaignId: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("campaign_escalations")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["campaign_escalations", v.campaignId] });
    },
  });
}
