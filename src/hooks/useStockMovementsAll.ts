import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StockMovement } from "@/hooks/useParts";

export function useStockMovementsAll() {
  return useQuery({
    queryKey: ["stock_movements_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as StockMovement[];
    },
  });
}
