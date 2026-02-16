import { useState, useCallback, useMemo } from "react";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Schedule = () => {
  const { chargers, importChargers, updateCharger, moveChargerToPhase, clearData } = useAssessmentData();
  const { session } = useAuth();
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
        campaignName=""
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
