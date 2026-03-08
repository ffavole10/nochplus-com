import { useState, useCallback, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { toast } from "sonner";

const Schedule = () => {
  usePageTitle('Schedule');
  const { chargers: localChargers, importChargers, updateCharger, moveChargerToPhase, clearData } = useAssessmentData();
  const { session } = useAuth();
  const { selectedCampaignId, selectedCampaignName } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);

  // Convert DB charger records to AssessmentCharger format
  const dbChargers: AssessmentCharger[] = useMemo(() => {
    return chargerRecords.map(chargerRecordToAssessment);
  }, [chargerRecords]);

  // Use DB chargers when a campaign is selected, otherwise fall back to local
  const chargers = selectedCampaignId ? dbChargers : localChargers;

  const {
    campaigns,
    activeCampaign,
    addCampaign,
    startCampaign,
    endCampaign,
    updateChargerStatus,
  } = useCampaignManager(session);

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
      />
    </div>
  );
};

export default Schedule;
