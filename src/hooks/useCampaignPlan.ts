import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type PlanStatus = "draft" | "scheduled" | "quoted" | "active" | "completed" | "cancelled";

export interface CampaignPlan {
  id: string;
  campaign_id: string;
  name: string;
  status: PlanStatus;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  working_days: string[];
  hrs_per_charger: number;
  hrs_per_day: number;
  break_hrs: number;
  travel_time_min: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanTechnician {
  id: string;
  plan_id: string;
  technician_id: string;
  home_base_lat: number | null;
  home_base_lng: number | null;
  home_base_city: string;
  assigned_regions: string[];
}

export interface PlanCharger {
  id: string;
  plan_id: string;
  charger_id: string;
  technician_id: string | null;
  sequence_order: number | null;
  priority: string;
  estimated_hours: number;
  status: string;
  notes: string | null;
}

function parseWorkingDays(raw: Json): string[] {
  if (Array.isArray(raw)) return raw as string[];
  return ["mon", "tue", "wed", "thu", "fri"];
}

function parseRegions(raw: Json | null): string[] {
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

function rowToPlan(row: any): CampaignPlan {
  return {
    ...row,
    status: row.status as PlanStatus,
    working_days: parseWorkingDays(row.working_days),
  };
}

export function useCampaignPlan(campaignId: string | null) {
  const { session } = useAuth();
  const [plans, setPlans] = useState<CampaignPlan[]>([]);
  const [activePlan, setActivePlan] = useState<CampaignPlan | null>(null);
  const [technicians, setTechnicians] = useState<PlanTechnician[]>([]);
  const [planChargers, setPlanChargers] = useState<PlanCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all plans for this campaign
  const loadPlans = useCallback(async () => {
    if (!campaignId) { setPlans([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("campaign_plans")
      .select("*")
      .eq("campaign_id", campaignId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) { console.error("Failed to load plans:", error); setLoading(false); return; }
    setPlans((data || []).map(rowToPlan));
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // Load plan children when active plan changes
  const loadPlanDetails = useCallback(async (planId: string) => {
    const [techRes, chargerRes] = await Promise.all([
      supabase.from("campaign_plan_technicians").select("*").eq("plan_id", planId),
      supabase.from("campaign_plan_chargers").select("*").eq("plan_id", planId).order("sequence_order", { ascending: true }),
    ]);
    setTechnicians((techRes.data || []).map(t => ({
      ...t,
      assigned_regions: parseRegions(t.assigned_regions),
    })));
    setPlanChargers(chargerRes.data || []);
  }, []);

  const selectPlan = useCallback(async (planId: string | null) => {
    if (!planId) { setActivePlan(null); setTechnicians([]); setPlanChargers([]); return; }
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setActivePlan(plan);
      await loadPlanDetails(planId);
    }
  }, [plans, loadPlanDetails]);

  // Create a new plan
  const createPlan = useCallback(async (name: string, config?: Partial<CampaignPlan>) => {
    if (!campaignId || !session) return null;
    const { data, error } = await supabase
      .from("campaign_plans")
      .insert({
        campaign_id: campaignId,
        name,
        created_by: session.user.id,
        start_date: config?.start_date || null,
        end_date: config?.end_date || null,
        working_days: (config?.working_days || ["mon", "tue", "wed", "thu", "fri"]) as unknown as Json,
        hrs_per_charger: config?.hrs_per_charger ?? 2,
        hrs_per_day: config?.hrs_per_day ?? 8,
        break_hrs: config?.break_hrs ?? 1,
        travel_time_min: config?.travel_time_min ?? 15,
        customer_id: config?.customer_id || null,
      })
      .select()
      .single();
    if (error) { toast.error("Failed to create plan"); console.error(error); return null; }
    const newPlan = rowToPlan(data);
    setPlans(prev => [newPlan, ...prev]);
    setActivePlan(newPlan);
    setTechnicians([]);
    setPlanChargers([]);
    toast.success(`Plan "${name}" created`);
    return newPlan;
  }, [campaignId, session]);

  // Auto-save plan config with debounce
  const savePlanConfig = useCallback(async (updates: Partial<CampaignPlan>) => {
    if (!activePlan) return;
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Update local state immediately
    const updated = { ...activePlan, ...updates };
    setActivePlan(updated);
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));

    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      const dbUpdates: Record<string, any> = {};
      if (updates.working_days !== undefined) dbUpdates.working_days = updates.working_days as unknown as Json;
      if (updates.hrs_per_charger !== undefined) dbUpdates.hrs_per_charger = updates.hrs_per_charger;
      if (updates.hrs_per_day !== undefined) dbUpdates.hrs_per_day = updates.hrs_per_day;
      if (updates.break_hrs !== undefined) dbUpdates.break_hrs = updates.break_hrs;
      if (updates.travel_time_min !== undefined) dbUpdates.travel_time_min = updates.travel_time_min;
      if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
      if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.customer_id !== undefined) dbUpdates.customer_id = updates.customer_id;

      const { error } = await supabase
        .from("campaign_plans")
        .update(dbUpdates)
        .eq("id", activePlan.id);
      if (error) { console.error("Failed to save plan:", error); toast.error("Failed to save"); }
      setSaving(false);
      setSaved(true);
    }, 1000);
  }, [activePlan]);

  // Technician management
  const addTechnician = useCallback(async (techId: string, techName: string, lat?: number | null, lng?: number | null, city?: string) => {
    if (!activePlan) return;
    const { data, error } = await supabase
      .from("campaign_plan_technicians")
      .insert({
        plan_id: activePlan.id,
        technician_id: techId,
        home_base_lat: lat ?? null,
        home_base_lng: lng ?? null,
        home_base_city: city || "",
        assigned_regions: [] as unknown as Json,
      })
      .select()
      .single();
    if (error) { console.error(error); return; }
    setTechnicians(prev => [...prev, { ...data, assigned_regions: [] }]);
  }, [activePlan]);

  const removeTechnician = useCallback(async (techId: string) => {
    if (!activePlan) return;
    await supabase.from("campaign_plan_technicians").delete().eq("plan_id", activePlan.id).eq("technician_id", techId);
    setTechnicians(prev => prev.filter(t => t.technician_id !== techId));
  }, [activePlan]);

  // Charger management
  const addChargers = useCallback(async (chargerIds: string[], priority?: string, estimatedHours?: number) => {
    if (!activePlan || chargerIds.length === 0) return;
    const existing = new Set(planChargers.map(c => c.charger_id));
    const newIds = chargerIds.filter(id => !existing.has(id));
    if (newIds.length === 0) return;

    const rows = newIds.map(id => ({
      plan_id: activePlan.id,
      charger_id: id,
      priority: priority || "medium",
      estimated_hours: estimatedHours ?? activePlan.hrs_per_charger,
    }));

    const { data, error } = await supabase
      .from("campaign_plan_chargers")
      .insert(rows)
      .select();
    if (error) { console.error(error); toast.error("Failed to add chargers"); return; }
    setPlanChargers(prev => [...prev, ...(data || [])]);
    toast.success(`Added ${newIds.length} charger(s) to plan`);
  }, [activePlan, planChargers]);

  const removeCharger = useCallback(async (chargerId: string) => {
    if (!activePlan) return;
    await supabase.from("campaign_plan_chargers").delete().eq("plan_id", activePlan.id).eq("charger_id", chargerId);
    setPlanChargers(prev => prev.filter(c => c.charger_id !== chargerId));
  }, [activePlan]);

  // Soft delete plan
  const deletePlan = useCallback(async (planId: string) => {
    await supabase.from("campaign_plans").update({ status: "cancelled" }).eq("id", planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (activePlan?.id === planId) {
      setActivePlan(null);
      setTechnicians([]);
      setPlanChargers([]);
    }
    toast.success("Plan cancelled");
  }, [activePlan]);

  return {
    plans,
    activePlan,
    technicians,
    planChargers,
    loading,
    saving,
    saved,
    selectPlan,
    createPlan,
    savePlanConfig,
    addTechnician,
    removeTechnician,
    addChargers,
    removeCharger,
    deletePlan,
    reload: loadPlans,
  };
}
