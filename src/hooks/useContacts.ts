import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Contact = {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  role: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export function useContacts(customerId?: string) {
  return useQuery({
    queryKey: ["contacts", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("customer_id", customerId!)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data || []) as Contact[];
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Omit<Contact, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .insert(contact as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Contact;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", vars.customer_id] });
      toast.success("Contact added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
