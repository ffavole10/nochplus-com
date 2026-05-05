import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DealStage, DealStageTransition, StageTransitionType } from "@/types/growth";
import { classifyTransition } from "@/types/growth";

export function useDealStageTransitions(dealId: string | null | undefined) {
  return useQuery({
    queryKey: ["deal-stage-transitions", dealId || "none"],
    queryFn: async (): Promise<DealStageTransition[]> => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from("deal_stage_transitions" as any)
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!dealId,
  });
}

export function useRecentStageTransitions(days = 7) {
  return useQuery({
    queryKey: ["deal-stage-transitions-recent", days],
    queryFn: async (): Promise<DealStageTransition[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("deal_stage_transitions" as any)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export interface CommitStageInput {
  deal_id: string;
  partner_id: string;
  from_stage: DealStage;
  to_stage: DealStage;
  notes: string;
  reason_code?: string | null;
  reason_notes?: string | null;
  final_value?: number | null;
  current_value: number;
}

export function useCommitStageTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommitStageInput) => {
      const type: StageTransitionType = classifyTransition(input.from_stage, input.to_stage);
      const update: Record<string, any> = {
        stage: input.to_stage,
        last_activity_at: new Date().toISOString(),
      };

      if (type === "closed_won") {
        update.win_reason = input.reason_code;
        update.win_reason_notes = input.reason_notes || null;
        update.loss_reason = null;
        update.loss_reason_notes = null;
        update.closed_at = new Date().toISOString();
        update.actual_close_date = new Date().toISOString().slice(0, 10);
        if (typeof input.final_value === "number") {
          update.value = input.final_value;
          update.actual_arr = input.final_value;
        }
      } else if (type === "closed_lost") {
        update.loss_reason = input.reason_code;
        update.loss_reason_notes = input.reason_notes || null;
        update.win_reason = null;
        update.win_reason_notes = null;
        update.closed_at = new Date().toISOString();
        update.actual_close_date = new Date().toISOString().slice(0, 10);
      } else if (type === "reopen") {
        update.win_reason = null;
        update.win_reason_notes = null;
        update.loss_reason = null;
        update.loss_reason_notes = null;
        update.closed_at = null;
        update.actual_close_date = null;
      }

      const { data: dealUpd, error: dealErr } = await supabase
        .from("deals" as any)
        .update(update)
        .eq("id", input.deal_id)
        .select()
        .single();
      if (dealErr) throw dealErr;

      const { data: userData } = await supabase.auth.getUser();
      const valueAt =
        type === "closed_won" && typeof input.final_value === "number"
          ? input.final_value
          : input.current_value;

      const { error: txErr } = await supabase.from("deal_stage_transitions" as any).insert({
        deal_id: input.deal_id,
        from_stage: input.from_stage,
        to_stage: input.to_stage,
        transition_type: type,
        reason_code: input.reason_code || null,
        notes: input.notes || null,
        value_at_transition: valueAt,
        user_id: userData.user?.id ?? null,
      } as any);
      if (txErr) throw txErr;

      return dealUpd;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal", vars.deal_id] });
      qc.invalidateQueries({ queryKey: ["deal-stage-transitions", vars.deal_id] });
      qc.invalidateQueries({ queryKey: ["deal-stage-transitions-recent"] });
    },
  });
}
