import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountActivityEntry = {
  id: string;
  customer_id: string;
  actor: string | null;
  actor_user_id: string | null;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  created_at: string;
};

export function useAccountActivity(customerId?: string) {
  return useQuery({
    queryKey: ["account-activity", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_activity_log" as any)
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as AccountActivityEntry[];
    },
  });
}
