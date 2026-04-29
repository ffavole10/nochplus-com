import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentOutput } from "@/types/growth";

export interface LatestBriefSummary {
  generated_at: string;
  buying_signal_flag?: "none" | "weak" | "moderate" | "strong";
}

export function useLatestScribeBriefs() {
  return useQuery({
    queryKey: ["agent_outputs", "latest_scribe", "all"],
    queryFn: async (): Promise<Record<string, LatestBriefSummary>> => {
      const { data, error } = await supabase
        .from("agent_outputs" as any)
        .select("deal_id, generated_at, content")
        .eq("agent_name", "scribe")
        .eq("output_type", "brief")
        .order("generated_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, LatestBriefSummary> = {};
      ((data as any[]) || []).forEach((row) => {
        if (!map[row.deal_id]) {
          map[row.deal_id] = {
            generated_at: row.generated_at,
            buying_signal_flag: row.content?.buying_signal_flag,
          };
        }
      });
      return map;
    },
  });
}

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
      const resp = await supabase.functions.invoke("generate-brief", {
        body: { deal_id: dealId },
      });
      if (resp.error) throw resp.error;
      const data = resp.data as any;
      if (data?.error) throw new Error(data.error);
      return { output: data?.output as AgentOutput, parseFailed: !!data?.parse_failed };
    },
    onSuccess: ({ output }) => {
      qc.invalidateQueries({ queryKey: ["agent_outputs", output.deal_id] });
      qc.invalidateQueries({ queryKey: ["agent_outputs", "latest_scribe", "all"] });
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
