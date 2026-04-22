import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerMeta } from "@/types/growth";

export function usePartnerMeta(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-meta", partnerId],
    queryFn: async (): Promise<PartnerMeta | null> => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from("partners_meta" as any)
        .select("*")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
    enabled: !!partnerId,
  });
}

export function useAllPartnerMeta() {
  return useQuery({
    queryKey: ["partner-meta-all"],
    queryFn: async (): Promise<PartnerMeta[]> => {
      const { data, error } = await supabase.from("partners_meta" as any).select("*");
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useUpsertPartnerMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: Partial<PartnerMeta> & { partner_id: string }) => {
      const { data, error } = await supabase
        .from("partners_meta" as any)
        .upsert(meta as any, { onConflict: "partner_id" })
        .select()
        .single();
      if (error) throw error;
      return data as any as PartnerMeta;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["partner-meta", data.partner_id] });
      qc.invalidateQueries({ queryKey: ["partner-meta-all"] });
    },
  });
}
