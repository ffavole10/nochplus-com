import { useState, useCallback, useMemo } from "react";
import { AssessmentDashboard } from "@/components/assessment/AssessmentDashboard";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { Database } from "lucide-react";

const Dataset = () => {
  const { selectedCampaignId } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);

  const chargers = useMemo(() => {
    return chargerRecords.map(r => chargerRecordToAssessment(r));
  }, [chargerRecords]);

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

  if (!selectedCampaignId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view dataset.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
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
        onUpdate={() => {}}
      />
    </div>
  );
};

export default Dataset;
