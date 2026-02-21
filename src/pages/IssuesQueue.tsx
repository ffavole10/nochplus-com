import { useState, useCallback, useMemo } from "react";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { TicketsView } from "@/components/assessment/TicketsView";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { AssessmentCharger } from "@/types/assessment";
import { Database } from "lucide-react";
import { useServiceTicketsStore, makeSteps } from "@/stores/serviceTicketsStore";
import { ServiceTicket, WORKFLOW_STEPS_TEMPLATE } from "@/types/serviceTicket";

const IssuesQueue = () => {
  const { selectedCampaignId, selectedCampaignName, selectedCustomer } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);
  const addTicket = useServiceTicketsStore((s) => s.addTicket);
  const getNextTicketId = useServiceTicketsStore((s) => s.getNextTicketId);

  const chargers = useMemo(() => {
    return chargerRecords.map(r => chargerRecordToAssessment(r));
  }, [chargerRecords]);

  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  const handleApproveToServiceDesk = useCallback((charger: AssessmentCharger): string | null => {
    const ticketId = getNextTicketId();
    const now = new Date().toISOString();

    // Determine charger type for the service ticket
    const chargerType = charger.assetRecordType === "DCFC" ? "DC_L3" : "AC_L2";

    // Determine priority mapping
    const priorityMap: Record<string, "Critical" | "High" | "Medium" | "Low"> = {
      Critical: "Critical",
      High: "High",
      Medium: "Medium",
      Low: "Low",
    };

    const newTicket: ServiceTicket = {
      id: `st-${Date.now()}`,
      ticketId,
      source: "campaign",
      sourceCampaignName: selectedCampaignName || "Campaign",
      customer: {
        name: selectedCustomer || charger.accountName || "Unknown",
        company: charger.accountName || selectedCustomer || "Unknown",
        email: "",
        phone: "",
        address: [charger.address, charger.city, charger.state, charger.zip].filter(Boolean).join(", "),
      },
      charger: {
        brand: "BTC",
        serialNumber: charger.assetName,
        type: chargerType,
        location: [charger.address, charger.city, charger.state].filter(Boolean).join(", "),
      },
      photos: [],
      issue: {
        description: charger.ticketSubject || "Issue reported from campaign assessment. See ticket details for more information.",
      },
      priority: priorityMap[charger.priorityLevel] || "Medium",
      status: "pending_review",
      currentStep: 1,
      workflowSteps: makeSteps(1),
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: now,
          action: `Ticket created from campaign issue approval`,
          performedBy: "Account Manager",
        },
        {
          id: `h-${Date.now() + 1}`,
          timestamp: now,
          action: `Source: ${selectedCampaignName || "Campaign"} — Issue: ${charger.ticketId || charger.assetName}`,
          performedBy: "System",
        },
      ],
      metadata: {
        issueId: charger.id,
        campaignId: selectedCampaignId || undefined,
        campaignName: selectedCampaignName || undefined,
        approvedBy: "current-user",
        approvedByName: "Account Manager",
        approvedAt: now,
      },
    };

    addTicket(newTicket);
    return ticketId;
  }, [addTicket, getNextTicketId, selectedCampaignId, selectedCampaignName, selectedCustomer]);

  if (!selectedCampaignId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view issues.
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
        onApproveToServiceDesk={handleApproveToServiceDesk}
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

export default IssuesQueue;
