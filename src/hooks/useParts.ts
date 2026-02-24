import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Part {
  id: string;
  part_number: string;
  part_name: string;
  description: string;
  category: string;
  charger_type: string;
  manufacturer: string;
  qty_in_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  location_bin: string;
  unit_cost: number;
  supplier: string;
  supplier_part_number: string;
  lead_time_days: number;
  last_price_update: string;
  compatible_swis: string[];
  compatible_models: string[];
  weight_lbs: number;
  dimensions: string;
  photo_url: string | null;
  datasheet_url: string | null;
  notes: string;
  tags: string[];
  active: boolean;
  usage_count_30d: number;
  last_used_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  part_id: string;
  movement_type: string;
  quantity: number;
  reason: string;
  ticket_id: string | null;
  purchase_order_id: string | null;
  technician: string | null;
  notes: string;
  created_by: string | null;
  balance_after: number;
  created_at: string;
}

export const PART_CATEGORIES = [
  "Electrical Components",
  "Power Boards",
  "Communication Modules",
  "RFID/Card Readers",
  "Cables & Connectors",
  "Displays & Screens",
  "Enclosure & Housing",
  "Cooling/HVAC",
  "Safety Components",
  "Software/Firmware",
  "Consumables",
];

export const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];

export const MANUFACTURERS = ["BTC", "ABB", "Delta", "Tritium", "Signet", "Other"];

export function useParts() {
  return useQuery({
    queryKey: ["parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("*")
        .order("part_name");
      if (error) throw error;
      return data as Part[];
    },
  });
}

export function useStockMovements(partId?: string) {
  return useQuery({
    queryKey: ["stock_movements", partId],
    queryFn: async () => {
      let q = supabase.from("stock_movements").select("*").order("created_at", { ascending: false });
      if (partId) q = q.eq("part_id", partId);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data as StockMovement[];
    },
    enabled: !!partId,
  });
}

export function useCreatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (part: Omit<Part, "id" | "created_at" | "updated_at" | "usage_count_30d" | "last_used_date" | "last_price_update">) => {
      const { data, error } = await supabase.from("parts").insert(part).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      toast.success("Part created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Part> & { id: string }) => {
      const { error } = await supabase.from("parts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      toast.success("Part updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      toast.success("Part deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partId, quantity, reason, notes }: { partId: string; quantity: number; reason: string; notes?: string }) => {
      // Get current stock
      const { data: part, error: fetchErr } = await supabase.from("parts").select("qty_in_stock").eq("id", partId).single();
      if (fetchErr) throw fetchErr;
      const newQty = (part.qty_in_stock || 0) + quantity;
      
      const { error: updateErr } = await supabase.from("parts").update({ qty_in_stock: newQty }).eq("id", partId);
      if (updateErr) throw updateErr;

      const { error: mvErr } = await supabase.from("stock_movements").insert({
        part_id: partId,
        movement_type: "add",
        quantity,
        reason,
        notes: notes || "",
        balance_after: newQty,
      });
      if (mvErr) throw mvErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast.success("Stock added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUseStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partId, quantity, reason, ticketId, notes }: { partId: string; quantity: number; reason: string; ticketId?: string; notes?: string }) => {
      const { data: part, error: fetchErr } = await supabase.from("parts").select("qty_in_stock").eq("id", partId).single();
      if (fetchErr) throw fetchErr;
      const newQty = Math.max(0, (part.qty_in_stock || 0) - quantity);

      const { error: updateErr } = await supabase.from("parts").update({ qty_in_stock: newQty, last_used_date: new Date().toISOString() }).eq("id", partId);
      if (updateErr) throw updateErr;

      const { error: mvErr } = await supabase.from("stock_movements").insert({
        part_id: partId,
        movement_type: "use",
        quantity: -quantity,
        reason,
        ticket_id: ticketId || null,
        notes: notes || "",
        balance_after: newQty,
      });
      if (mvErr) throw mvErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast.success("Stock updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
