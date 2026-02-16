import { useState, useCallback, useMemo } from "react";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { TicketsView } from "@/components/assessment/TicketsView";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { Database } from "lucide-react";

const AssessmentTracker = () => {
  const { selectedCampaignId } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);

  const chargers = useMemo(() => {
    return chargerRecords.map(r => chargerRecordToAssessment(r));
  }, [chargerRecords]);

  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  if (!selectedCampaignId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view tickets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <TicketsView
        chargers={chargers}
        onSelectCharger={handleSelectCharger}
      />

      <ChargerDetailModal
        charger={selectedCharger}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={() => {}}
      />
    </div>
  );
};

export default AssessmentTracker;
