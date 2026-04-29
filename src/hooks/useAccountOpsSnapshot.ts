import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccountOpsSnapshot } from "@/types/growth";

export function useAccountOpsSnapshot(customerId?: string | null) {
  return useQuery({
    queryKey: ["account_ops_snapshot", customerId || "none"],
    enabled: !!customerId,
    queryFn: async (): Promise<AccountOpsSnapshot | null> => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from("account_ops_snapshot" as any)
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });
}

export function useAccountOpsSnapshots() {
  return useQuery({
    queryKey: ["account_ops_snapshot", "all"],
    queryFn: async (): Promise<Record<string, AccountOpsSnapshot>> => {
      const { data, error } = await supabase
        .from("account_ops_snapshot" as any)
        .select("*");
      if (error) throw error;
      const map: Record<string, AccountOpsSnapshot> = {};
      ((data as any[]) || []).forEach((row) => {
        map[row.customer_id] = row;
      });
      return map;
    },
  });
}
