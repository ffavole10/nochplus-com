import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Deal, DealStage } from "@/types/growth";

export function useDeals(partnerId?: string | null) {
  return useQuery({
    queryKey: ["deals", partnerId || "all"],
    queryFn: async (): Promise<Deal[]> => {
      let q = supabase.from("deals" as any).select("*").order("updated_at", { ascending: false });
      if (partnerId) q = q.eq("partner_id", partnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async (): Promise<Deal | null> => {
      if (!dealId) return null;
      const { data, error } = await supabase.from("deals" as any).select("*").eq("id", dealId).maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
    enabled: !!dealId,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Deal> & { partner_id: string; deal_name: string }) => {
      const { data, error } = await supabase.from("deals" as any).insert(input as any).select().single();
      if (error) throw error;
      return data as any as Deal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deals", data.partner_id] });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      const { data, error } = await supabase.from("deals" as any).update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as any as Deal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deals", data.partner_id] });
      qc.invalidateQueries({ queryKey: ["deal", data.id] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; partner_id?: string }) => {
      const { error } = await supabase.from("deals" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, note, partner_id }: { id: string; stage: DealStage; note?: string; partner_id: string }) => {
      const { data, error } = await supabase.from("deals" as any).update({ stage } as any).eq("id", id).select().single();
      if (error) throw error;
      // Log stage change as activity if note provided
      if (note && note.trim()) {
        await supabase.from("activities" as any).insert({
          partner_id,
          deal_id: id,
          type: "Other",
          summary: `Deal moved to "${stage}"`,
          outcome: note.trim(),
        } as any);
      }
      return data as any as Deal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal", data.id] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
