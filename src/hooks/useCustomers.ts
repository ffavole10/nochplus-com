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
