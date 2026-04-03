import { useState, useCallback, useMemo, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { PlanSelectorBar } from "@/components/schedule/PlanSelectorBar";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { useCampaignPlan, CampaignPlan } from "@/hooks/useCampaignPlan";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { CampaignConfig, DEFAULT_CONFIG } from "@/types/campaign";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const DAY_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_REVERSE: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };

function planToConfig(plan: CampaignPlan, campaignName: string): CampaignConfig {
  return {
    ...DEFAULT_CONFIG,
    name: campaignName,
    startDate: plan.start_date || new Date().toISOString().split("T")[0],
    endDate: plan.end_date || null,
    workingDays: (plan.working_days || []).map(d => DAY_MAP[d] ?? 1),
    hoursPerCharger: plan.hrs_per_charger,
    workingHoursPerDay: plan.hrs_per_day,
    breakTime: plan.break_hrs,
    travelBuffer: plan.travel_time_min / 60,
  };
}

function configToPlanUpdates(config: CampaignConfig, prev: CampaignPlan): Partial<CampaignPlan> {
  return {
    start_date: config.startDate || null,
    end_date: config.endDate || null,
    working_days: config.workingDays.map(d => DAY_REVERSE[d] || "mon"),
    hrs_per_charger: config.hoursPerCharger,
    hrs_per_day: config.workingHoursPerDay,
    break_hrs: config.breakTime,
    travel_time_min: Math.round(config.travelBuffer * 60),
  };
}

const Schedule = () => {
  usePageTitle('Schedule');
  const { chargers: localChargers, importChargers, updateCharger, moveChargerToPhase, clearData } = useAssessmentData();
  const { session } = useAuth();
  const { selectedCampaignId, selectedCampaignName } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);
  const [searchParams, setSearchParams] = useSearchParams();

  const dbChargers: AssessmentCharger[] = useMemo(() => {
    return chargerRecords.map(chargerRecordToAssessment);
  }, [chargerRecords]);

  const chargers = selectedCampaignId ? dbChargers : localChargers;

  // Build charger lookup map
  const chargerLookup = useMemo(() => {
    const m = new Map<string, AssessmentCharger>();
    chargers.forEach(c => m.set(c.id, c));
    return m;
  }, [chargers]);

  const {
    campaigns,
    activeCampaign,
    addCampaign,
    startCampaign,
    endCampaign,
    updateChargerStatus,
  } = useCampaignManager(session);

  const {
    plans,
    activePlan,
    technicians: planTechnicians,
    planChargers,
    scheduleDays,
    scheduleSummaries,
    scheduleWarnings,
    loading: plansLoading,
    saving,
    saved,
    generating,
    selectPlan,
    createPlan,
    savePlanConfig,
    addTechnician,
    removeTechnician,
    addChargers,
    removeCharger,
    generateSchedule,
    updateScheduleDay,
    deletePlan,
  } = useCampaignPlan(selectedCampaignId || null);

  // Restore plan from URL param on load
  useEffect(() => {
    const planId = searchParams.get("plan");
    if (planId && plans.length > 0 && (!activePlan || activePlan.id !== planId)) {
      selectPlan(planId);
    }
  }, [searchParams, plans, activePlan, selectPlan]);

  // Sync active plan to URL
  useEffect(() => {
    const currentPlanParam = searchParams.get("plan");
    if (activePlan && currentPlanParam !== activePlan.id) {
      setSearchParams(prev => {
        prev.set("plan", activePlan.id);
        return prev;
      }, { replace: true });
    } else if (!activePlan && currentPlanParam) {
      setSearchParams(prev => {
        prev.delete("plan");
        return prev;
      }, { replace: true });
    }
  }, [activePlan, searchParams, setSearchParams]);

  const initialConfig = useMemo(() => {
    if (activePlan) return planToConfig(activePlan, selectedCampaignName || "");
    return { ...DEFAULT_CONFIG, name: selectedCampaignName || "" };
  }, [activePlan, selectedCampaignName]);

  const configWithTechs = useMemo(() => {
    if (!activePlan) return initialConfig;
    return {
      ...initialConfig,
      technicians: planTechnicians.map(t => t.home_base_city || t.technician_id),
    };
  }, [initialConfig, activePlan, planTechnicians]);

  const handleConfigChange = useCallback((newConfig: CampaignConfig) => {
    if (activePlan) {
      const updates = configToPlanUpdates(newConfig, activePlan);
      savePlanConfig(updates);
    }
  }, [activePlan, savePlanConfig]);

  const handleCreatePlan = useCallback(async (name: string) => {
    await createPlan(name);
  }, [createPlan]);

  const handleSelectPlan = useCallback(async (planId: string | null) => {
    await selectPlan(planId);
  }, [selectPlan]);

  const handleGenerateSchedule = useCallback(async () => {
    await generateSchedule(chargerLookup);
  }, [generateSchedule, chargerLookup]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(chargers, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chargers]);

  return (
    <div className="flex-1 flex flex-col">
      <PlanSelectorBar
        plans={plans}
        activePlan={activePlan}
        saving={saving}
        saved={saved}
        onSelectPlan={handleSelectPlan}
        onCreatePlan={handleCreatePlan}
        onDeletePlan={deletePlan}
      />

      <ScheduleView
        chargers={chargers}
        activeCampaign={activeCampaign}
        campaigns={campaigns}
        campaignName={selectedCampaignName || ""}
        onCreateCampaign={addCampaign}
        onStartCampaign={startCampaign}
        onEndCampaign={(id) => {
          endCampaign(id);
          toast.success("Campaign ended");
        }}
        onUpdateStatus={updateChargerStatus}
        onUpdateChargerPhase={moveChargerToPhase}
        onSelectCharger={() => {}}
        onExport={handleExport}
        onClear={clearData}
        onImport={importChargers}
        activePlan={activePlan}
        planChargers={planChargers}
        onConfigChange={handleConfigChange}
        initialConfig={activePlan ? configWithTechs : undefined}
        onRemoveChargerFromPlan={removeCharger}
        scheduleDays={scheduleDays}
        scheduleSummaries={scheduleSummaries}
        scheduleWarnings={scheduleWarnings}
        generating={generating}
        onGenerateSchedule={handleGenerateSchedule}
        planTechnicians={planTechnicians}
      />
    </div>
  );
};

export default Schedule;
