import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Location = {
  id: string;
  customer_id: string;
  site_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  charger_count: number;
  created_at: string;
  updated_at: string;
};

export function useLocations(customerId?: string) {
  return useQuery({
    queryKey: ["locations", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations" as any)
        .select("*")
        .eq("customer_id", customerId!)
        .order("site_name");
      if (error) throw error;
      return (data || []) as unknown as Location[];
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: Omit<Location, "id" | "created_at" | "updated_at" | "charger_count">) => {
      const { data, error } = await supabase
        .from("locations" as any)
        .insert(loc as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Location;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["locations", vars.customer_id] });
      toast.success("Location added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
