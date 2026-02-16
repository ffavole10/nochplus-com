import { Ticket, Wrench, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignType, CAMPAIGN_TYPE_CONFIG } from "@/types/campaign";

interface TicketsEmptyStateProps {
  campaignType?: CampaignType;
  onCreateTicket?: () => void;
}

export function TicketsEmptyState({ campaignType, onCreateTicket }: TicketsEmptyStateProps) {
  if (campaignType === "preventive_maintenance") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets Yet</h3>
        <p className="text-sm text-muted-foreground mb-6">
          This is normal for preventive maintenance campaigns. Tickets will be created as
          technicians discover issues during scheduled visits.
        </p>
        {onCreateTicket && (
          <Button onClick={onCreateTicket} variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Ticket Manually
          </Button>
        )}
      </div>
    );
  }

  if (campaignType === "hybrid") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-5">
          <Wrench className="h-8 w-8 text-accent-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets Found</h3>
        <p className="text-sm text-muted-foreground mb-6">
          This hybrid campaign includes both preventive and reactive work. Tickets will appear
          as issues are identified or reported.
        </p>
        {onCreateTicket && (
          <Button onClick={onCreateTicket} variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Ticket Manually
          </Button>
        )}
      </div>
    );
  }

  // Default / reactive
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
        <Ticket className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets Found</h3>
      <p className="text-sm text-muted-foreground mb-6">
        All tickets have been resolved or no issues have been identified yet.
      </p>
      {onCreateTicket && (
        <Button onClick={onCreateTicket} variant="outline" className="gap-1.5">
          <Plus className="h-4 w-4" /> Create New Ticket
        </Button>
      )}
    </div>
  );
}
