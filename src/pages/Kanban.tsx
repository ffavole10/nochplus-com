import { useState, useCallback, useMemo } from "react";
import { AssessmentKanban } from "@/components/assessment/AssessmentKanban";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { AssessmentCharger } from "@/types/assessment";

const Kanban = () => {
  const { chargers, updateCharger, moveChargerToPhase } = useAssessmentData();
  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <AssessmentKanban
        chargers={chargers}
        onMoveCharger={moveChargerToPhase}
        onSelectCharger={handleSelectCharger}
      />

      <ChargerDetailModal
        charger={selectedCharger}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={updateCharger}
      />
    </div>
  );
};

export default Kanban;
