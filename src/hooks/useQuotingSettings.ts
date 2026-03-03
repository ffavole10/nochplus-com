import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Rate Cards ───
export type RateCard = {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type RateCardItem = {
  id: string;
  rate_card_id: string;
  category: string;
  label: string;
  rate: number;
  unit: string;
  sort_order: number;
};

export function useRateCards() {
  return useQuery({
    queryKey: ["rate_cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate_cards" as any).select("*").order("created_at");
      if (error) throw error;
      return (data || []) as unknown as RateCard[];
    },
  });
}

export function useRateCardItems(rateCardId?: string) {
  return useQuery({
    queryKey: ["rate_card_items", rateCardId],
    queryFn: async () => {
      let q = supabase.from("rate_card_items" as any).select("*").order("sort_order");
      if (rateCardId) q = q.eq("rate_card_id", rateCardId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RateCardItem[];
    },
  });
}

export function useCreateRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: { name: string; description: string; is_default: boolean; copyFromId?: string }) => {
      const { data, error } = await supabase.from("rate_cards" as any).insert({ name: card.name, description: card.description, is_default: card.is_default }).select().single();
      if (error) throw error;
      const newCard = data as unknown as RateCard;
      if (card.copyFromId) {
        const { data: items } = await supabase.from("rate_card_items" as any).select("*").eq("rate_card_id", card.copyFromId);
        if (items && items.length > 0) {
          const newItems = (items as unknown as RateCardItem[]).map(({ id, rate_card_id, ...rest }) => ({ ...rest, rate_card_id: newCard.id }));
          await supabase.from("rate_card_items" as any).insert(newItems as any);
        }
      }
      return newCard;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate_cards"] }); qc.invalidateQueries({ queryKey: ["rate_card_items"] }); toast.success("Rate card created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RateCard> & { id: string }) => {
      const { error } = await supabase.from("rate_cards" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate_cards"] }); toast.success("Rate card updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate_cards"] }); qc.invalidateQueries({ queryKey: ["rate_card_items"] }); toast.success("Rate card deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertRateCardItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateCardId, items }: { rateCardId: string; items: Omit<RateCardItem, "id">[] }) => {
      await supabase.from("rate_card_items" as any).delete().eq("rate_card_id", rateCardId);
      if (items.length > 0) {
        const { error } = await supabase.from("rate_card_items" as any).insert(items as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate_card_items"] }); toast.success("Rate card items saved"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Quote Rules ───
export type QuoteRule = {
  id: string;
  name: string;
  description: string;
  condition_type: string;
  condition_operator: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useQuoteRules() {
  return useQuery({
    queryKey: ["quote_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_rules" as any).select("*").order("priority");
      if (error) throw error;
      return (data || []) as unknown as QuoteRule[];
    },
  });
}

export function useCreateQuoteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<QuoteRule, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("quote_rules" as any).insert(rule as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quote_rules"] }); toast.success("Rule created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateQuoteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuoteRule> & { id: string }) => {
      const { error } = await supabase.from("quote_rules" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quote_rules"] }); toast.success("Rule updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteQuoteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quote_rules"] }); toast.success("Rule deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Customer Overrides ───
export type CustomerOverride = {
  id: string;
  customer_name: string;
  rate_card_id: string;
  override_items: any[];
  notes: string;
  created_at: string;
  updated_at: string;
};

export function useCustomerOverrides() {
  return useQuery({
    queryKey: ["customer_rate_overrides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_rate_overrides" as any).select("*").order("customer_name");
      if (error) throw error;
      return (data || []) as unknown as CustomerOverride[];
    },
  });
}

export function useCreateCustomerOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: Omit<CustomerOverride, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("customer_rate_overrides" as any).insert(o as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer_rate_overrides"] }); toast.success("Override created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCustomerOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerOverride> & { id: string }) => {
      const { error } = await supabase.from("customer_rate_overrides" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer_rate_overrides"] }); toast.success("Override updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCustomerOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_rate_overrides" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer_rate_overrides"] }); toast.success("Override deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
}
