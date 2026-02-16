import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Partner {
  id: string;
  value: string;
  label: string;
  category: string;
  sort_order: number;
  created_at: string;
}

export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("label", { ascending: true });
      if (error) throw error;
      return data as Partner[];
    },
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partner: { value: string; label: string; category: string; sort_order?: number }) => {
      const { data, error } = await supabase.from("partners").insert(partner).select().single();
      if (error) throw error;
      return data as Partner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; label?: string; category?: string; sort_order?: number }) => {
      const { data, error } = await supabase.from("partners").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Partner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useDeletePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}
