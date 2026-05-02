import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  AccountStrategy,
  StrategyDecisionEntry,
  StrategyPlay,
  StrategyKpi,
  StrategyRisk,
  StrategyAccountType,
} from "@/types/strategy";
import { getKpiTemplatesForTypes } from "@/types/strategy";

const sb = supabase as any;

// All strategies (for portfolio view)
export function useAllStrategies() {
  return useQuery({
    queryKey: ["strategies"],
    queryFn: async (): Promise<AccountStrategy[]> => {
      const { data, error } = await sb.from("account_strategies").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AccountStrategy[];
    },
  });
}

// Single strategy by customer
export function useStrategyByCustomer(customerId?: string) {
  return useQuery({
    queryKey: ["strategy", "customer", customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<AccountStrategy | null> => {
      const { data, error } = await sb
        .from("account_strategies")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as AccountStrategy | null;
    },
  });
}

export function useEnsureStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customerId: string): Promise<AccountStrategy> => {
      const { data: existing } = await sb
        .from("account_strategies")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (existing) return existing as AccountStrategy;
      const { data: userData } = await supabase.auth.getUser();
      const owner = userData?.user?.email || null;
      const { data, error } = await sb
        .from("account_strategies")
        .insert({ customer_id: customerId, owner })
        .select()
        .single();
      if (error) throw error;
      return data as AccountStrategy;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["strategy", "customer", data.customer_id] });
      qc.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

export function useUpdateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccountStrategy> & { id: string }) => {
      const { data, error } = await sb.from("account_strategies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as AccountStrategy;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["strategy", "customer", data.customer_id] });
      qc.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

export function useMarkReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb
        .from("account_strategies")
        .update({ last_reviewed_at: new Date().toISOString(), status: "active" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AccountStrategy;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["strategy", "customer", data.customer_id] });
      qc.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Marked as reviewed");
    },
  });
}

// Decision map
export function useDecisionMap(strategyId?: string) {
  return useQuery({
    queryKey: ["strategy-decision-map", strategyId],
    enabled: !!strategyId,
    queryFn: async (): Promise<StrategyDecisionEntry[]> => {
      const { data, error } = await sb.from("strategy_decision_map").select("*").eq("strategy_id", strategyId).order("created_at");
      if (error) throw error;
      return (data || []) as StrategyDecisionEntry[];
    },
  });
}

export function useDecisionMapMutations(strategyId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["strategy-decision-map", strategyId] });

  const add = useMutation({
    mutationFn: async (entry: Omit<StrategyDecisionEntry, "id" | "created_at">) => {
      const { data, error } = await sb.from("strategy_decision_map").insert(entry).select().single();
      if (error) throw error;
      return data as StrategyDecisionEntry;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StrategyDecisionEntry> & { id: string }) => {
      const { data, error } = await sb.from("strategy_decision_map").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as StrategyDecisionEntry;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("strategy_decision_map").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

// Plays
export function usePlays(strategyId?: string) {
  return useQuery({
    queryKey: ["strategy-plays", strategyId],
    enabled: !!strategyId,
    queryFn: async (): Promise<StrategyPlay[]> => {
      const { data, error } = await sb.from("strategy_plays").select("*").eq("strategy_id", strategyId).order("due_date", { nullsFirst: false });
      if (error) throw error;
      return (data || []) as StrategyPlay[];
    },
  });
}

export function usePlayMutations(strategyId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["strategy-plays", strategyId] });

  const add = useMutation({
    mutationFn: async (play: Omit<StrategyPlay, "id" | "created_at" | "completed_at">) => {
      const { data, error } = await sb.from("strategy_plays").insert(play).select().single();
      if (error) throw error;
      return data as StrategyPlay;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StrategyPlay> & { id: string }) => {
      const payload: any = { ...updates };
      if (updates.status === "complete") payload.completed_at = new Date().toISOString();
      const { data, error } = await sb.from("strategy_plays").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as StrategyPlay;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("strategy_plays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

// KPIs
export function useKpis(strategyId?: string) {
  return useQuery({
    queryKey: ["strategy-kpis", strategyId],
    enabled: !!strategyId,
    queryFn: async (): Promise<StrategyKpi[]> => {
      const { data, error } = await sb.from("strategy_kpis").select("*").eq("strategy_id", strategyId).order("created_at");
      if (error) throw error;
      return (data || []) as StrategyKpi[];
    },
  });
}

export function useKpiMutations(strategyId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["strategy-kpis", strategyId] });

  const add = useMutation({
    mutationFn: async (kpi: Omit<StrategyKpi, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await sb.from("strategy_kpis").insert(kpi).select().single();
      if (error) throw error;
      return data as StrategyKpi;
    },
    onSuccess: invalidate,
  });

  const addMany = useMutation({
    mutationFn: async (kpis: Omit<StrategyKpi, "id" | "created_at" | "updated_at">[]) => {
      if (!kpis.length) return [];
      const { data, error } = await sb.from("strategy_kpis").insert(kpis).select();
      if (error) throw error;
      return data as StrategyKpi[];
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StrategyKpi> & { id: string }) => {
      const { data, error } = await sb.from("strategy_kpis").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as StrategyKpi;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("strategy_kpis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, addMany, update, remove };
}

// Risks
export function useRisks(strategyId?: string) {
  return useQuery({
    queryKey: ["strategy-risks", strategyId],
    enabled: !!strategyId,
    queryFn: async (): Promise<StrategyRisk[]> => {
      const { data, error } = await sb.from("strategy_risks").select("*").eq("strategy_id", strategyId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StrategyRisk[];
    },
  });
}

export function useRiskMutations(strategyId?: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["strategy-risks", strategyId] });

  const add = useMutation({
    mutationFn: async (risk: Omit<StrategyRisk, "id" | "created_at">) => {
      const { data, error } = await sb.from("strategy_risks").insert(risk).select().single();
      if (error) throw error;
      return data as StrategyRisk;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StrategyRisk> & { id: string }) => {
      const { data, error } = await sb.from("strategy_risks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as StrategyRisk;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("strategy_risks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

// Bulk seed KPIs from templates
export async function seedKpisFromTemplates(
  strategyId: string,
  types: StrategyAccountType[],
  existingNames: string[] = []
) {
  const templates = getKpiTemplatesForTypes(types).filter((t) => t.primary);
  const toInsert = templates
    .filter((t) => !existingNames.includes(t.name))
    .map((t) => ({
      strategy_id: strategyId,
      name: t.name,
      unit: t.unit,
      target_value: t.default_target,
      current_value: 0,
      kpi_template_origin: types.join(","),
      is_primary: true,
      is_deferred: !!t.is_deferred,
      deferred_reason: t.deferred_reason || null,
    }));
  if (!toInsert.length) return;
  await sb.from("strategy_kpis").insert(toInsert);
}

// Tour persistence
export function useTourCompleted() {
  return useQuery({
    queryKey: ["profile-tour-flag"],
    queryFn: async (): Promise<boolean> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return false;
      const { data } = await sb.from("profiles").select("has_completed_strategy_tour").eq("user_id", userData.user.id).maybeSingle();
      return !!data?.has_completed_strategy_tour;
    },
  });
}

export function useMarkTourCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      await sb.from("profiles").update({ has_completed_strategy_tour: true }).eq("user_id", userData.user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-tour-flag"] }),
  });
}
