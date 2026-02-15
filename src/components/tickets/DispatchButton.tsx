import { useState } from "react";
import { FileText, CheckCircle, Send, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { EstimateBuilder } from "./EstimateBuilder";

export type EstimateStatus = "none" | "draft" | "sent";

interface DispatchButtonProps {
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
  onEstimateStatusChange?: (status: EstimateStatus) => void;
}

export function DispatchButton({ ticket, swiMatch, onEstimateStatusChange }: DispatchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>("none");

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
          Review / Edit
        </Button>
        <EstimateBuilder
          open={isOpen}
          onOpenChange={setIsOpen}
          ticket={ticket}
          swiMatch={swiMatch}
          onDispatched={() => { setDispatched(true); setIsOpen(false); onEstimateStatusChange?.("sent"); }}
          onStatusChange={handleEstimateStatusChange}
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
      />
    </>
  );
}
