import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { currentQuarter, FOCUS_5_LIMIT, type AccountStrategy, type FocusHistoryEntry } from "@/types/strategy";

const sb = supabase as any;

async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email || null;
}

/** Add a strategy to Focus 5. Validates the 5-account cap client-side too. */
export function useAddToFocus5() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ strategyId, customerId, reason }: { strategyId: string; customerId: string; reason: string }) => {
      // Client-side guard
      const { data: focused } = await sb
        .from("account_strategies")
        .select("id")
        .eq("is_focus", true);
      if ((focused?.length || 0) >= FOCUS_5_LIMIT) {
        throw new Error("You already have 5 Focus accounts. Remove one first.");
      }
      const quarter = currentQuarter();
      const email = await getCurrentUserEmail();
      const nowIso = new Date().toISOString();

      const { data, error } = await sb
        .from("account_strategies")
        .update({
          is_focus: true,
          focus_quarter: quarter,
          focus_reason: reason,
          focus_added_at: nowIso,
          focus_added_by: email,
        })
        .eq("id", strategyId)
        .select()
        .single();
      if (error) throw error;

      // Log history
      await sb.from("focus_history").insert({
        strategy_id: strategyId,
        customer_id: customerId,
        focus_quarter: quarter,
        focus_reason: reason,
        added_at: nowIso,
        added_by: email,
      });

      return data as AccountStrategy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      qc.invalidateQueries({ queryKey: ["focus-history"] });
      toast.success("Added to Focus 5");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveFromFocus5() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ strategyId }: { strategyId: string }) => {
      const email = await getCurrentUserEmail();
      const nowIso = new Date().toISOString();

      const { data, error } = await sb
        .from("account_strategies")
        .update({
          is_focus: false,
          focus_quarter: null,
          focus_reason: null,
          focus_added_at: null,
          focus_added_by: null,
        })
        .eq("id", strategyId)
        .select()
        .single();
      if (error) throw error;

      // Close the latest open history row for this strategy
      const { data: openRows } = await sb
        .from("focus_history")
        .select("id")
        .eq("strategy_id", strategyId)
        .is("removed_at", null)
        .order("added_at", { ascending: false })
        .limit(1);
      if (openRows && openRows[0]) {
        await sb
          .from("focus_history")
          .update({ removed_at: nowIso, removed_by: email })
          .eq("id", openRows[0].id);
      }

      return data as AccountStrategy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      qc.invalidateQueries({ queryKey: ["focus-history"] });
      toast.success("Removed from Focus 5");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFocusReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ strategyId, reason }: { strategyId: string; reason: string }) => {
      const { data, error } = await sb
        .from("account_strategies")
        .update({ focus_reason: reason })
        .eq("id", strategyId)
        .select()
        .single();
      if (error) throw error;
      return data as AccountStrategy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

export function useFocusHistory(strategyId?: string) {
  return useQuery({
    queryKey: ["focus-history", strategyId],
    enabled: !!strategyId,
    queryFn: async (): Promise<FocusHistoryEntry[]> => {
      const { data, error } = await sb
        .from("focus_history")
        .select("*")
        .eq("strategy_id", strategyId)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FocusHistoryEntry[];
    },
  });
}

// ============ Focus Mode (per-user toggle) ============
export function useFocusMode() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["focus-mode"],
    queryFn: async (): Promise<{ enabled: boolean; quarter: string | null }> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return { enabled: false, quarter: null };
      const { data } = await sb
        .from("profiles")
        .select("focus_mode_enabled, focus_mode_quarter")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      return {
        enabled: !!data?.focus_mode_enabled,
        quarter: data?.focus_mode_quarter || null,
      };
    },
    staleTime: 30_000,
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const quarter = next ? currentQuarter() : null;
      await sb
        .from("profiles")
        .update({ focus_mode_enabled: next, focus_mode_quarter: quarter })
        .eq("user_id", userData.user.id);
      return { enabled: next, quarter };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["focus-mode"] });
    },
  });

  return {
    enabled: query.data?.enabled ?? false,
    quarter: query.data?.quarter ?? null,
    isLoading: query.isLoading,
    toggle: (next: boolean) => toggle.mutate(next),
  };
}

/** Returns the set of customer_ids that are currently Focus 5. */
export function useFocus5CustomerIds() {
  return useQuery({
    queryKey: ["focus-5-customer-ids"],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await sb
        .from("account_strategies")
        .select("customer_id")
        .eq("is_focus", true);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.customer_id as string));
    },
    staleTime: 10_000,
  });
}
