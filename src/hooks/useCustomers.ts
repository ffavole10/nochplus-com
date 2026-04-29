import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  created_at: string;
  updated_at: string;
};

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers" as any)
        .select("*")
        .order("company");
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
      toast.success("Customer updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Get all locations for this customer
      const { data: locations } = await supabase
        .from("locations")
        .select("id")
        .eq("customer_id", id);
      
      const locationIds = (locations || []).map((l: any) => l.id);
      
      if (locationIds.length > 0) {
        // Nullify foreign key references in noch_plus_submissions
        await supabase
          .from("noch_plus_submissions")
          .update({ location_id: null } as any)
          .in("location_id", locationIds);
        
        // Nullify foreign key references in service_tickets
        await supabase
          .from("service_tickets")
          .update({ location_id: null } as any)
          .in("location_id", locationIds);

        // Nullify foreign key references in environmental_correlations
        await supabase
          .from("environmental_correlations")
          .update({ location_id: null } as any)
          .in("location_id", locationIds);

        // Delete charger_locations
        await supabase
          .from("charger_locations")
          .delete()
          .in("location_id", locationIds);

        // Delete locations
        await supabase
          .from("locations")
          .delete()
          .in("id", locationIds);
      }

      // Nullify company_id references in noch_plus_submissions
      await supabase
        .from("noch_plus_submissions")
        .update({ company_id: null } as any)
        .eq("company_id", id);

      // Nullify company_id references in service_tickets
      await supabase
        .from("service_tickets")
        .update({ company_id: null } as any)
        .eq("company_id", id);

      // Delete contacts
      await supabase
        .from("contacts")
        .delete()
        .eq("customer_id", id);

      // Now delete the customer
      const { error } = await supabase
        .from("customers" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
