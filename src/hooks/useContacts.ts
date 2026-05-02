import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAccountActivity } from "@/lib/accountActivity";
import type { ContactType } from "@/lib/contactTypes";

export type { ContactType };

export type Contact = {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  role: string | null;
  title: string | null;
  contact_type: ContactType | null;
  notes: string | null;
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
      return (data || []) as unknown as Contact[];
    },
  });
}

type ContactInput = Partial<Omit<Contact, "id" | "created_at" | "updated_at">> & {
  customer_id: string;
  name: string;
  email: string;
};

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: ContactInput) => {
      // If marking primary, unset other primaries first
      if (contact.is_primary) {
        await supabase
          .from("contacts")
          .update({ is_primary: false } as any)
          .eq("customer_id", contact.customer_id);
      }
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          customer_id: contact.customer_id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone || "",
          role: contact.role ?? null,
          title: (contact as any).title ?? null,
          contact_type: contact.contact_type ?? "other",
          notes: contact.notes ?? null,
          is_primary: !!contact.is_primary,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await logAccountActivity({
        customer_id: contact.customer_id,
        action: "contact_added",
        new_value: contact.name,
      });
      return data as unknown as Contact;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["account-activity", vars.customer_id] });
      toast.success("Contact added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customer_id, ...updates }: Partial<Contact> & { id: string; customer_id: string }) => {
      if ((updates as any).is_primary) {
        await supabase
          .from("contacts")
          .update({ is_primary: false } as any)
          .eq("customer_id", customer_id)
          .neq("id", id);
      }
      const { error } = await supabase
        .from("contacts")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      await logAccountActivity({
        customer_id,
        action: (updates as any).is_primary ? "primary_contact_changed" : "contact_updated",
        new_value: (updates as any).name ?? null,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["account-activity", vars.customer_id] });
      toast.success("Contact updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customer_id, name }: { id: string; customer_id: string; name?: string }) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      await logAccountActivity({
        customer_id,
        action: "contact_removed",
        old_value: name ?? null,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["account-activity", vars.customer_id] });
      toast.success("Contact removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
