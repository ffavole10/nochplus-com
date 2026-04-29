import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAccountActivity } from "@/lib/accountActivity";

export type Customer = {
  id: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  ticket_count: number;
  total_revenue: number;
  last_service_date: string | null;
  status: string;
  pricing_type: string;
  website_url: string;
  logo_url: string | null;
  industry: string | null;
  description: string | null;
  headquarters_address: string | null;
  categories: string[];
  customer_type: "cpo" | "cms" | "oem" | "site_host" | "fleet_operator" | "other" | null;
  customer_type_other: string | null;
  domain: string | null;
  hq_city: string | null;
  hq_region: string | null;
  source: "inbound" | "outbound" | "referral" | "conference" | "investor_network" | "other" | null;
  relationship_type: "partner" | "customer" | "prospect" | "both" | null;
  internal_notes: string | null;
  duplicate_confirmed_distinct_of: string[] | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** By default, soft-deleted accounts are hidden. Pass `includeDeleted` to include them. */
export function useCustomers(opts: { includeDeleted?: boolean } = {}) {
  const { includeDeleted = false } = opts;
  return useQuery({
    queryKey: ["customers", { includeDeleted }],
    queryFn: async () => {
      let q = supabase.from("customers" as any).select("*").order("company");
      if (!includeDeleted) q = q.is("deleted_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Partial<Omit<Customer, "id" | "created_at" | "updated_at" | "ticket_count" | "total_revenue" | "last_service_date">> & { company: string; contact_name: string; email: string }) => {
      const { data, error } = await supabase
        .from("customers" as any)
        .insert(customer as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase
        .from("customers" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Inspect linked records before deciding hard vs soft delete. */
export async function getAccountLinkCounts(customerId: string, companyName: string) {
  const [tRes, dRes, woByPartner, woByName, eRes] = await Promise.all([
    supabase.from("service_tickets").select("id", { count: "exact", head: true }).eq("company_id", customerId),
    supabase.from("deals" as any).select("id", { count: "exact", head: true }).eq("partner_id", customerId),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("partner_id", customerId),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("client_name", companyName),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("company_id", customerId),
  ]);
  const ticketCount = tRes.count || 0;
  const dealCount = dRes.count || 0;
  const woCount = (woByPartner.count || 0) + (woByName.count || 0);
  const estimateCount = eRes.count || 0;
  return {
    tickets: ticketCount || 0,
    deals: dealCount || 0,
    workOrders: woCount || 0,
    estimates: estimateCount || 0,
    total: (ticketCount || 0) + (dealCount || 0) + (woCount || 0) + (estimateCount || 0),
  };
}

/** Soft delete: sets deleted_at = now() and status = inactive. Hard delete fallback only when called with mode='hard'. */
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode = "soft", company }: { id: string; mode?: "soft" | "hard"; company?: string }) => {
      if (mode === "soft") {
        const { error } = await supabase
          .from("customers" as any)
          .update({ deleted_at: new Date().toISOString(), status: "inactive" } as any)
          .eq("id", id);
        if (error) throw error;
        await logAccountActivity({ customer_id: id, action: "deleted", new_value: company || null });
        return;
      }
      // Hard delete only used when account has zero linked records.
      // Get all locations for this customer
      const { data: locations } = await supabase
        .from("locations")
        .select("id")
        .eq("customer_id", id);

      const locationIds = (locations || []).map((l: any) => l.id);

      if (locationIds.length > 0) {
        await supabase.from("noch_plus_submissions").update({ location_id: null } as any).in("location_id", locationIds);
        await supabase.from("service_tickets").update({ location_id: null } as any).in("location_id", locationIds);
        await supabase.from("environmental_correlations").update({ location_id: null } as any).in("location_id", locationIds);
        await supabase.from("charger_locations").delete().in("location_id", locationIds);
        await supabase.from("locations").delete().in("id", locationIds);
      }

      await supabase.from("noch_plus_submissions").update({ company_id: null } as any).eq("company_id", id);
      await supabase.from("service_tickets").update({ company_id: null } as any).eq("company_id", id);
      await supabase.from("contacts").delete().eq("customer_id", id);

      const { error } = await supabase.from("customers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["account-activity", vars.id] });
      toast.success(vars.mode === "hard" ? "Account deleted" : "Account moved to trash");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
