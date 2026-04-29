import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChargerCustomerRelationship, ChargerRelationshipType } from "@/types/growth";

export function useChargerRelationships(customerId?: string | null) {
  return useQuery({
    queryKey: ["charger_customer_relationships", customerId || "none"],
    enabled: !!customerId,
    queryFn: async (): Promise<ChargerCustomerRelationship[]> => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("charger_customer_relationships" as any)
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any) || []) as ChargerCustomerRelationship[];
    },
  });
}

export function useLinkChargers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      customerId: string;
      chargerIds: string[];
      relationshipType: ChargerRelationshipType;
    }) => {
      const rows = args.chargerIds.map((cid) => ({
        customer_id: args.customerId,
        charger_id: cid,
        relationship_type: args.relationshipType,
      }));
      const { data, error } = await supabase
        .from("charger_customer_relationships" as any)
        .upsert(rows, { onConflict: "charger_id,customer_id,relationship_type", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["charger_customer_relationships", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["account_ops_snapshot"] });
    },
  });
}

export function useAvailableChargers(search: string) {
  return useQuery({
    queryKey: ["available_chargers", search],
    queryFn: async () => {
      let q = supabase
        .from("charger_records")
        .select("id, station_id, station_name, model, address, city, state")
        .limit(50);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`station_id.ilike.${term},station_name.ilike.${term},model.ilike.${term},city.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
