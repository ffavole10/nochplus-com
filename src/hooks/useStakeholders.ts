import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Stakeholder } from "@/types/growth";

export function useStakeholders(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["stakeholders", partnerId],
    queryFn: async (): Promise<Stakeholder[]> => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("stakeholders" as any)
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!partnerId,
  });
}

export function useCreateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Stakeholder> & { partner_id: string; name: string }) => {
      const { data, error } = await supabase.from("stakeholders" as any).insert(input as any).select().single();
      if (error) throw error;
      return data as any as Stakeholder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stakeholders", data.partner_id] });
    },
  });
}

export function useUpdateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Stakeholder> & { id: string }) => {
      const { data, error } = await supabase.from("stakeholders" as any).update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as any as Stakeholder;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stakeholders", data.partner_id] });
    },
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; partner_id: string }) => {
      const { error } = await supabase.from("stakeholders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.partner_id] });
    },
  });
}
