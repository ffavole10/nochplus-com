import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "./useContacts";

/**
 * Fetch the primary contact for a single account (from the contacts table).
 * Returns null when no primary contact exists yet.
 */
export function usePrimaryContact(customerId?: string | null) {
  return useQuery({
    queryKey: ["primary-contact", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("customer_id", customerId!)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Contact) || null;
    },
  });
}

/**
 * Batch-fetch primary contacts for many accounts in a single round trip.
 * Returns a map of customer_id -> Contact for cheap O(1) lookup in lists.
 */
export function usePrimaryContactsByCustomer(customerIds: string[]) {
  // Stabilize the key so render-by-render arrays don't refetch.
  const key = [...new Set(customerIds)].sort().join(",");
  return useQuery({
    queryKey: ["primary-contacts-batch", key],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const ids = [...new Set(customerIds)];
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .in("customer_id", ids)
        .eq("is_primary", true);
      if (error) throw error;
      const map: Record<string, Contact> = {};
      for (const row of (data || []) as unknown as Contact[]) {
        map[row.customer_id] = row;
      }
      return map;
    },
  });
}
