import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  employee_type: string;
  level: string;
  hourly_rate: number;
  travel_rate: number;
  status: string;
  active: boolean;
  home_base_city: string;
  home_base_state: string;
  home_base_lat: number | null;
  home_base_lng: number | null;
  coverage_radius_miles: number;
  service_regions: string[];
  charger_types: string[];
  work_schedule: Record<string, { start: string; end: string }>;
  max_jobs_per_day: number;
  active_jobs_count: number;
  preferred_contact: string;
  company_name: string | null;
  contract_terms: string | null;
  payment_terms: string | null;
  insurance_expiration: string | null;
  jobs_completed_30d: number;
  hours_logged_30d: number;
  revenue_generated_30d: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRegion {
  id: string;
  name: string;
  description: string;
  cities: string[];
  technician_ids: string[];
  created_at: string;
  updated_at: string;
}

const LEVEL_DISPLAY: Record<string, string> = {
  level_1: "Level 1 - Field Techs",
  level_2: "Level 2 - Senior Field Techs",
  level_3: "Level 3 - Lead Techs",
  level_4: "Level 4 - Master Techs",
};

export const getLevelDisplay = (level: string) => LEVEL_DISPLAY[level] || level;

export const getLevelColor = (level: string) => {
  switch (level) {
    case "level_1": return "bg-blue-500 text-white";
    case "level_2": return "bg-purple-500 text-white";
    case "level_3": return "bg-orange-500 text-white";
    case "level_4": return "bg-green-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

export const getStatusInfo = (status: string) => {
  switch (status) {
    case "available": return { label: "Available", icon: "✓", className: "text-green-600" };
    case "on_job": return { label: "On Job", icon: "🔧", className: "text-blue-600" };
    case "off_duty": return { label: "Off Duty", icon: "💤", className: "text-muted-foreground" };
    case "on_vacation": return { label: "On Vacation", icon: "🏖️", className: "text-orange-600" };
    default: return { label: status, icon: "•", className: "text-muted-foreground" };
  }
};

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Technician[];
    },
  });
}

export function useServiceRegions() {
  return useQuery({
    queryKey: ["service_regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_regions")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ServiceRegion[];
    },
  });
}

export function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tech: Omit<Technician, "id" | "created_at" | "updated_at" | "jobs_completed_30d" | "hours_logged_30d" | "revenue_generated_30d">) => {
      const { error } = await supabase.from("technicians").insert(tech as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["technicians"] }); toast.success("Technician created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Technician> & { id: string }) => {
      const { error } = await supabase.from("technicians").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["technicians"] }); toast.success("Technician updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technicians").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["technicians"] }); toast.success("Technician deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (region: Omit<ServiceRegion, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("service_regions").insert(region as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_regions"] }); toast.success("Region created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service_regions"] }); toast.success("Region deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
