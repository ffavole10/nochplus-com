import { useState, useCallback, useEffect } from "react";
import { Campaign, ScheduleItemStatus } from "@/types/campaign";
import { calculateStatistics } from "@/lib/scheduleGenerator";

const CAMPAIGN_STORAGE_KEY = "assessment-campaigns";

export function useCampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const stored = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const activeCampaign = campaigns.find(c => c.status === "active") || null;

  const addCampaign = useCallback((campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
  }, []);

  const startCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, status: "active" as const } : c
    ));
  }, []);

  const endCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.map(c =>
      c.id === id ? { ...c, status: "completed" as const } : c
    ));
  }, []);

  const updateChargerStatus = useCallback((campaignId: string, chargerId: string, status: ScheduleItemStatus, data?: { actualHours?: number; notes?: string }) => {
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
      return { ...c, schedule, statistics: calculateStatistics(schedule) };
    }));
  }, []);

  const rescheduleCharger = useCallback((campaignId: string, chargerId: string, newDate: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== campaignId) return c;
      // Remove from current day
      let item: any = null;
      const schedule = c.schedule.map(day => {
        const found = day.chargers.find(ch => ch.chargerId === chargerId);
        if (found) item = { ...found, status: "not_started" as const };
        return { ...day, chargers: day.chargers.filter(ch => ch.chargerId !== chargerId) };
      }).filter(day => day.chargers.length > 0);

      if (!item) return c;

      // Add to new date
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

      return { ...c, schedule, statistics: calculateStatistics(schedule) };
    }));
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
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
  };
}
