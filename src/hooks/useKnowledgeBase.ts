import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_Q_AND_A, type KBCategory } from "@/constants/nochPlusTiers";

export interface KBItem {
  id: string;
  question: string;
  answer: string;
  category: KBCategory;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const QB_KEY = ["noch_plus_knowledge_base"];

export function useKnowledgeBase() {
  return useQuery({
    queryKey: QB_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noch_plus_knowledge_base" as any)
        .select("*")
        .order("category", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as KBItem[];
    },
  });
}

export function useSeedKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_Q_AND_A.map((qa) => ({
        question: qa.question,
        answer: qa.answer,
        category: qa.category,
        created_by: "system",
      }));
      const { error } = await supabase.from("noch_plus_knowledge_base" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QB_KEY }),
  });
}

export function useAddKBItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { question: string; answer: string; category: KBCategory }) => {
      const { error } = await supabase
        .from("noch_plus_knowledge_base" as any)
        .insert({ ...item, created_by: "staff" } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QB_KEY }),
  });
}

export function useUpdateKBItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, question, answer, category }: { id: string; question: string; answer: string; category: KBCategory }) => {
      const { error } = await supabase
        .from("noch_plus_knowledge_base" as any)
        .update({ question, answer, category, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QB_KEY }),
  });
}

export function useDeleteKBItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("noch_plus_knowledge_base" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QB_KEY }),
  });
}
