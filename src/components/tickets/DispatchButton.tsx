import { useState, useEffect } from "react";
import { FileText, CheckCircle, Send, Edit, Eye, ClipboardCopy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { EstimateBuilder } from "./EstimateBuilder";
import { DispatchModal } from "./DispatchModal";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignContext } from "@/contexts/CampaignContext";

export type EstimateStatus = "none" | "draft" | "sent" | "approved";

interface DispatchButtonProps {
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
  onEstimateStatusChange?: (status: EstimateStatus) => void;
  onAccountManagerChange?: (name: string) => void;
}

export function DispatchButton({ ticket, swiMatch, onEstimateStatusChange, onAccountManagerChange }: DispatchButtonProps) {
  const { selectedCampaignId } = useCampaignContext();
  const [isOpen, setIsOpen] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>("none");
  const [showDispatch, setShowDispatch] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load existing estimate status from DB on mount
  useEffect(() => {
    if (!selectedCampaignId) return;
    const ticketId = ticket.ticketId || ticket.id;
    
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("estimates")
        .select("status")
        .eq("campaign_id", selectedCampaignId)
        .or(`ticket_id.eq.${ticketId},station_id.eq.${ticket.id}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const s = data[0].status as EstimateStatus;
        setEstimateStatus(s);
        onEstimateStatusChange?.(s);
      }
      setDbLoaded(true);
    };

    fetchStatus();
  }, [selectedCampaignId, ticket.ticketId, ticket.id]);

  const handleEstimateStatusChange = (status: EstimateStatus) => {
    setEstimateStatus(status);
    onEstimateStatusChange?.(status);
  };

  if (dispatched) {
    return (
      <div className="flex items-center gap-2 text-sm text-optimal font-medium py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Dispatched</span>
      </div>
    );
  }

  // Approved state: View Estimate (read-only) + blinking Jobber button
  if (estimateStatus === "approved") {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="gap-2 border-optimal/30 text-optimal hover:bg-optimal/10"
        >
          <Eye className="h-3.5 w-3.5" />
          View Estimate
        </Button>
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); setShowDispatch(true); }}
          className="gap-1.5 animate-pulse"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Dispatch to Jobber
          <ExternalLink className="h-3 w-3" />
        </Button>
        <EstimateBuilder
          open={isOpen}
          onOpenChange={setIsOpen}
          ticket={ticket}
          swiMatch={swiMatch}
          onDispatched={() => { setDispatched(true); setIsOpen(false); }}
          onStatusChange={handleEstimateStatusChange}
          onAccountManagerChange={onAccountManagerChange}
          initialStatus="approved"
        />
        <DispatchModal
          open={showDispatch}
          onOpenChange={setShowDispatch}
          ticket={ticket}
          swiMatch={swiMatch}
          onDispatched={() => { setDispatched(true); setShowDispatch(false); }}
        />
      </div>
    );
  }

  // Sent state: Edit Estimate
  if (estimateStatus === "sent") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-optimal font-medium py-2">
          <Send className="h-4 w-4" />
          <span>Estimate Sent</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit Estimate
        </Button>
        <EstimateBuilder
          open={isOpen}
          onOpenChange={setIsOpen}
          ticket={ticket}
          swiMatch={swiMatch}
          onDispatched={() => { setDispatched(true); setIsOpen(false); onEstimateStatusChange?.("sent"); }}
          onStatusChange={handleEstimateStatusChange}
          onAccountManagerChange={onAccountManagerChange}
          initialStatus="sent"
        />
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        {estimateStatus === "draft" ? (
          <>
            <Edit className="h-3.5 w-3.5" />
            Edit Estimate
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            Create Estimate
          </>
        )}
      </Button>
      <EstimateBuilder
        open={isOpen}
        onOpenChange={setIsOpen}
        ticket={ticket}
        swiMatch={swiMatch}
        onDispatched={() => { setDispatched(true); setIsOpen(false); onEstimateStatusChange?.("sent"); }}
        onStatusChange={handleEstimateStatusChange}
        onAccountManagerChange={onAccountManagerChange}
      />
    </>
  );
}
