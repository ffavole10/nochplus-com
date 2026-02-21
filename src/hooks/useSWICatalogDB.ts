import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SWIOem {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface SWICatalogEntry {
  id: string;
  oem_id: string;
  folder: string;
  title: string;
  filename: string;
  description: string;
  charger_models: string[];
  issue_types: string[];
  service_categories: string[];
  priority: string[];
  estimated_time: string;
  required_parts: string[];
  created_at: string;
}

export function useSWIOems() {
  const [oems, setOems] = useState<SWIOem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("swi_oems")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("Failed to load OEMs:", error);
    } else {
      setOems(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addOem = async (name: string) => {
    const maxOrder = oems.length > 0 ? Math.max(...oems.map(o => o.sort_order)) + 1 : 0;
    const { error } = await supabase.from("swi_oems").insert({ name, sort_order: maxOrder });
    if (error) {
      toast.error("Failed to add OEM: " + error.message);
      return false;
    }
    toast.success(`OEM "${name}" added`);
    await load();
    return true;
  };

  const deleteOem = async (id: string, name: string) => {
    const { error } = await supabase.from("swi_oems").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete OEM: " + error.message);
      return false;
    }
    toast.success(`OEM "${name}" deleted`);
    await load();
    return true;
  };

  const updateOem = async (id: string, name: string) => {
    const { error } = await supabase.from("swi_oems").update({ name }).eq("id", id);
    if (error) {
      toast.error("Failed to update OEM: " + error.message);
      return false;
    }
    await load();
    return true;
  };

  return { oems, loading, reload: load, addOem, deleteOem, updateOem };
}

export function useSWICatalogEntries(oemId?: string) {
  const [entries, setEntries] = useState<SWICatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = supabase.from("swi_catalog_entries").select("*").order("folder").order("title");
    if (oemId) query = query.eq("oem_id", oemId);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to load SWI entries:", error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, [oemId]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (entry: Omit<SWICatalogEntry, "id" | "created_at">) => {
    const { error } = await supabase.from("swi_catalog_entries").insert(entry);
    if (error) {
      toast.error("Failed to add SWI entry: " + error.message);
      return false;
    }
    toast.success(`SWI "${entry.title}" added`);
    await load();
    return true;
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("swi_catalog_entries").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete entry: " + error.message);
      return false;
    }
    toast.success("SWI entry deleted");
    await load();
    return true;
  };

  return { entries, loading, reload: load, addEntry, deleteEntry };
}
