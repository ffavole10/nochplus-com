import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentOutput } from "@/types/growth";

export function useAgentOutputs(dealId?: string | null) {
  return useQuery({
    queryKey: ["agent_outputs", dealId || "none"],
    enabled: !!dealId,
    queryFn: async (): Promise<AgentOutput[]> => {
      if (!dealId) return [];
      const { data, error } = await supabase
        .from("agent_outputs" as any)
        .select("*")
        .eq("deal_id", dealId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return ((data as any) || []) as AgentOutput[];
    },
  });
}

export function useGenerateScribeBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dealId: string) => {
      // Prefer new structured-JSON function; fall back to legacy markdown function
      let resp = await supabase.functions.invoke("generate-brief", {
        body: { deal_id: dealId },
      });
      if (resp.error || (resp.data as any)?.error) {
        const fallback = await supabase.functions.invoke("pipeline-scribe-brief", {
          body: { deal_id: dealId },
        });
        if (fallback.error) throw fallback.error;
        if ((fallback.data as any)?.error) throw new Error((fallback.data as any).error);
        return (fallback.data as any)?.output as AgentOutput;
      }
      return (resp.data as any)?.output as AgentOutput;
    },
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ["agent_outputs", out.deal_id] });
    },
  });
}

// Scaffolded: insert placeholder rows for Closer / Forecaster
export function useGeneratePlaceholderOutput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      dealId: string;
      agent: "closer" | "forecaster";
    }) => {
      const map = {
        closer: { output_type: "proposal_draft", placeholder: "Closer agent — proposal draft generation will be wired in a future sprint." },
        forecaster: { output_type: "forecast", placeholder: "Forecaster agent — predictive close-date model coming soon." },
      } as const;
      const cfg = map[args.agent];
      const { data, error } = await supabase
        .from("agent_outputs" as any)
        .insert({
          deal_id: args.dealId,
          agent_name: args.agent,
          output_type: cfg.output_type,
          content: { markdown: `*${cfg.placeholder}*`, scaffolded: true },
        })
        .select()
        .single();
      if (error) throw error;
      return data as any as AgentOutput;
    },
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ["agent_outputs", out.deal_id] });
    },
  });
}
