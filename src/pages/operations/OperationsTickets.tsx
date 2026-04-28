import { Ticket } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import ServiceTickets from "@/pages/placeholders/ServiceTickets";

export default function OperationsTickets() {
  usePageTitle("Tickets");
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Tickets"
          subtitle="Customer-facing service tickets through the full lifecycle. Diagnosed by Neural OS Reasoning, dispatched via Neural OS Dispatch."
          icon={Ticket}
        />
      </div>
      <ServiceTickets />
    </div>
  );
}
