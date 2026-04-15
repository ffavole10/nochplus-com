import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnershipPlan {
  id: string;
  plan_token: string;
  company_name: string;
  contact_email: string;
  plan_data: any;
  total_monthly: number;
  total_annual: number;
  billing_cycle: string;
  status: string;
  shared_at: string;
  viewed_at: string | null;
  activated_at: string | null;
  expires_at: string;
}

const PLANS_KEY = ["noch_plus_partnership_plans"];

export function usePartnershipPlans() {
  return useQuery({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noch_plus_partnership_plans" as any)
        .select("*")
        .order("shared_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PartnershipPlan[];
    },
  });
}

export function useCreatePartnershipPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: {
      company_name: string;
      contact_email: string;
      plan_data: any;
      total_monthly: number;
      total_annual: number;
      billing_cycle: string;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("noch_plus_partnership_plans" as any)
        .insert(plan as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PartnershipPlan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}
