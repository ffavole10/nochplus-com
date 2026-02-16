import { useState, useCallback, useMemo } from "react";
import { AssessmentDashboard } from "@/components/assessment/AssessmentDashboard";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { CampaignProgressBanner } from "@/components/schedule/CampaignProgressBanner";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { useAuth } from "@/hooks/useAuth";
import { AssessmentCharger } from "@/types/assessment";
import { toast } from "sonner";

const Dataset = () => {
  const { chargers, updateCharger } = useAssessmentData();
  const { session } = useAuth();
  const { activeCampaign, endCampaign } = useCampaignManager(session);
  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");

  const stateOptions = useMemo(() => {
    return [...new Set(chargers.map(c => c.state).filter(Boolean))].sort();
  }, [chargers]);

  const filteredChargers = useMemo(() => {
    let result = [...chargers];
    if (selectedState) result = result.filter(c => c.state === selectedState);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.assetName.toLowerCase().includes(q) ||
        c.accountName.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.evseId.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") result = result.filter(c => c.assetRecordType === typeFilter);
    if (priorityFilter !== "all") result = result.filter(c => c.priorityLevel === priorityFilter);
    if (phaseFilter !== "all") result = result.filter(c => c.phase === phaseFilter);
    if (ticketFilter === "open") result = result.filter(c => c.hasOpenTicket);
    else if (ticketFilter === "solved") result = result.filter(c => c.ticketSolvedDate !== null);
    else if (ticketFilter === "any") result = result.filter(c => c.ticketId || c.ticketCreatedDate);
    return result;
  }, [chargers, selectedState, search, typeFilter, priorityFilter, phaseFilter, ticketFilter]);

  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col flex-1">
      {activeCampaign && (
        <div className="px-6 pt-4">
          <CampaignProgressBanner
            campaign={activeCampaign}
            onViewSchedule={() => {}}
            onEndCampaign={() => {
              endCampaign(activeCampaign.id);
              toast.success("Campaign ended");
            }}
          />
        </div>
      )}

      <AssessmentDashboard
        chargers={filteredChargers}
        onSelectCharger={handleSelectCharger}
        stateOptions={stateOptions}
        selectedState={selectedState}
        onStateChange={setSelectedState}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        phaseFilter={phaseFilter}
        onPhaseFilterChange={setPhaseFilter}
        ticketFilter={ticketFilter}
        onTicketFilterChange={setTicketFilter}
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

export default Dataset;
