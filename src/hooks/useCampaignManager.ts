import { useState, useCallback, useEffect } from "react";
import { Campaign, ScheduleItemStatus } from "@/types/campaign";
import { calculateStatistics } from "@/lib/scheduleGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useCampaignManager() {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Load campaigns from database
  const loadCampaigns = useCallback(async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load campaigns:", error);
      return;
    }

    const parsed: Campaign[] = (data || [])
      .filter((row: any) => row.data)
      .map((row: any) => ({
        ...(row.data as Campaign),
        id: row.id,
        name: row.name,
        status: row.status || row.data?.status || "draft",
      }));

    setCampaigns(parsed);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session) loadCampaigns();
    else setLoading(false);
  }, [session, loadCampaigns]);

  // Migrate any localStorage drafts to the database on first load
  useEffect(() => {
    if (!session || loading) return;
    const STORAGE_KEY = "assessment-campaigns";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const localCampaigns: Campaign[] = JSON.parse(stored);
      if (localCampaigns.length === 0) return;

      // Migrate each to DB
      const migrate = async () => {
        for (const c of localCampaigns) {
          await supabase.from("campaigns").insert({
            name: c.name,
            customer: c.configuration?.name || "Unknown",
            status: c.status,
            start_date: c.startDate || null,
            end_date: c.endDate || null,
            total_chargers: c.statistics?.totalChargers || 0,
            user_id: session.user.id,
            data: c as any,
          });
        }
        localStorage.removeItem(STORAGE_KEY);
        loadCampaigns();
        toast.success(`Migrated ${localCampaigns.length} draft(s) to the cloud`);
      };
      migrate();
    } catch {
      // ignore parse errors
    }
  }, [session, loading, loadCampaigns]);

  const activeCampaign = campaigns.find(c => c.status === "active") || null;

  const saveCampaignToDB = useCallback(async (campaign: Campaign) => {
    const { error } = await supabase.from("campaigns").upsert({
      id: campaign.id,
      name: campaign.name,
      customer: campaign.configuration?.name || "Unknown",
      status: campaign.status,
      start_date: campaign.startDate || null,
      end_date: campaign.endDate || null,
      total_chargers: campaign.statistics?.totalChargers || 0,
      health_score: 0,
      critical_count: 0,
      optimal_count: 0,
      degraded_count: 0,
      total_serviced: campaign.statistics?.completedChargers || 0,
      user_id: session?.user?.id || null,
      data: campaign as any,
    });
    if (error) {
      console.error("Failed to save campaign:", error);
      toast.error("Failed to save campaign");
    }
  }, [session]);

  const addCampaign = useCallback(async (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
    await saveCampaignToDB(campaign);
  }, [saveCampaignToDB]);

  const updateCampaignState = useCallback(async (updater: (prev: Campaign[]) => Campaign[]) => {
    let updated: Campaign | null = null;
    setCampaigns(prev => {
      const next = updater(prev);
      // Find the changed campaign
      for (const c of next) {
        const old = prev.find(p => p.id === c.id);
        if (old !== c) updated = c;
      }
      return next;
    });
    // Save after state update
    if (updated) {
      await saveCampaignToDB(updated);
    }
  }, [saveCampaignToDB]);

  const startCampaign = useCallback(async (id: string) => {
    await updateCampaignState(prev =>
      prev.map(c => c.id === id ? { ...c, status: "active" as const } : c)
    );
  }, [updateCampaignState]);

  const endCampaign = useCallback(async (id: string) => {
    await updateCampaignState(prev =>
      prev.map(c => c.id === id ? { ...c, status: "completed" as const } : c)
    );
  }, [updateCampaignState]);

  const updateChargerStatus = useCallback(async (campaignId: string, chargerId: string, status: ScheduleItemStatus, data?: { actualHours?: number; notes?: string }) => {
    let updatedCampaign: Campaign | null = null;
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c;
      const schedule = c.schedule.map(day => ({
        ...day,
        chargers: day.chargers.map(item => {
          if (item.chargerId !== chargerId) return item;
          return {
            ...item,
            status,
            actualHours: data?.actualHours ?? item.actualHours,
            completedAt: status === "completed" ? new Date().toISOString() : item.completedAt,
            notes: data?.notes ?? item.notes,
          };
        }),
      }));
      const updated = { ...c, schedule, statistics: calculateStatistics(schedule) };
      updatedCampaign = updated;
      return updated;
    }));
    if (updatedCampaign) await saveCampaignToDB(updatedCampaign);
  }, [saveCampaignToDB]);

  const rescheduleCharger = useCallback(async (campaignId: string, chargerId: string, newDate: string) => {
    let updatedCampaign: Campaign | null = null;
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c;
      let item: any = null;
      const schedule = c.schedule.map(day => {
        const found = day.chargers.find(ch => ch.chargerId === chargerId);
        if (found) item = { ...found, status: "not_started" as const };
        return { ...day, chargers: day.chargers.filter(ch => ch.chargerId !== chargerId) };
      }).filter(day => day.chargers.length > 0);

      if (!item) return c;

      const existingDay = schedule.find(d => d.date === newDate);
      if (existingDay) {
        existingDay.chargers.push({ ...item, sequenceNumber: existingDay.chargers.length + 1 });
      } else {
        const dt = new Date(newDate + "T00:00:00");
        const startDt = new Date(c.startDate + "T00:00:00");
        const weekNum = Math.floor((dt.getTime() - startDt.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        schedule.push({
          date: newDate,
          dayOfWeek: dt.getDay(),
          weekNumber: weekNum,
          chargers: [{ ...item, sequenceNumber: 1 }],
        });
        schedule.sort((a, b) => a.date.localeCompare(b.date));
      }

      const updated = { ...c, schedule, statistics: calculateStatistics(schedule) };
      updatedCampaign = updated;
      return updated;
    }));
    if (updatedCampaign) await saveCampaignToDB(updatedCampaign);
  }, [saveCampaignToDB]);

  const deleteCampaign = useCallback(async (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    await supabase.from("campaigns").delete().eq("id", id);
  }, []);

  return {
    campaigns,
    activeCampaign,
    addCampaign,
    startCampaign,
    endCampaign,
    updateChargerStatus,
    rescheduleCharger,
    deleteCampaign,
    loading,
  };
}
