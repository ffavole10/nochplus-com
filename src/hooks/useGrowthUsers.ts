import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GrowthUser {
  user_id: string;
  display_name: string;
  email: string;
}

export function useGrowthUsers() {
  return useQuery({
    queryKey: ["growth-users"],
    queryFn: async (): Promise<GrowthUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .order("display_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || (p.email?.split("@")[0] ?? "User"),
        email: p.email || "",
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useGrowthUserMap() {
  const { data: users = [] } = useGrowthUsers();
  const map: Record<string, GrowthUser> = {};
  users.forEach((u) => { map[u.user_id] = u; });
  return map;
}
