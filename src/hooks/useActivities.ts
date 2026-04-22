import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "@/types/growth";

interface ActivitiesFilter {
  partnerId?: string;
  dealId?: string;
}

export function useActivities({ partnerId, dealId }: ActivitiesFilter = {}) {
  return useQuery({
    queryKey: ["activities", partnerId || "all", dealId || "all"],
    queryFn: async (): Promise<Activity[]> => {
      let q = supabase.from("activities" as any).select("*").order("activity_date", { ascending: false });
      if (partnerId) q = q.eq("partner_id", partnerId);
      if (dealId) q = q.eq("deal_id", dealId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Activity> & { partner_id: string; type: Activity["type"]; summary: string }) => {
      const { data, error } = await supabase.from("activities" as any).insert(input as any).select().single();
      if (error) throw error;
      return data as any as Activity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
