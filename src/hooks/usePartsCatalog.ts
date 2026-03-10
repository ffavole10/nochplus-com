import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PartsCatalogItem {
  id: string;
  part_number: string | null;
  description: string;
  unit_price: number;
  unit: string | null;
  category: string | null;
  manufacturer: string | null;
  notes: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePartsCatalog(page = 0, pageSize = 50, search = "", sortField = "usage_count", sortAsc = false) {
  return useQuery({
    queryKey: ["parts_catalog", page, pageSize, search, sortField, sortAsc],
    queryFn: async () => {
      let query = supabase
        .from("parts_catalog")
        .select("*", { count: "exact" });

      if (search.trim()) {
        query = query.or(`description.ilike.%${search}%,part_number.ilike.%${search}%`);
      }

      query = query
        .order(sortField, { ascending: sortAsc })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data || []) as PartsCatalogItem[], totalCount: count || 0 };
    },
  });
}

export function usePartsCatalogSearch() {
  return async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const { data, error } = await supabase
      .from("parts_catalog")
      .select("id, description, unit_price, unit, category")
      .ilike("description", `%${searchTerm}%`)
      .order("usage_count", { ascending: false })
      .limit(8);
    if (error) {
      console.error("Parts catalog search error:", error);
      return [];
    }
    return data || [];
  };
}

export function useCreatePartsCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<PartsCatalogItem>) => {
      const { data, error } = await supabase
        .from("parts_catalog")
        .insert({
          description: item.description!,
          unit_price: item.unit_price ?? 0,
          part_number: item.part_number || null,
          unit: item.unit || "each",
          category: item.category || null,
          manufacturer: item.manufacturer || null,
          notes: item.notes || null,
          usage_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts_catalog"] });
      toast.success("Part saved");
    },
    onError: (e: any) => toast.error(`Failed to save part: ${e.message}`),
  });
}

export function useUpdatePartsCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PartsCatalogItem>) => {
      const { data, error } = await supabase
        .from("parts_catalog")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts_catalog"] });
      toast.success("Part saved");
    },
    onError: (e: any) => toast.error(`Failed to update part: ${e.message}`),
  });
}

export function useDeletePartsCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parts_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts_catalog"] });
      toast.success("Part deleted");
    },
    onError: (e: any) => toast.error(`Failed to delete part: ${e.message}`),
  });
}
