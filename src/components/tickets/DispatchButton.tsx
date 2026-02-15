import { useState } from "react";
import { FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { EstimateBuilder } from "./EstimateBuilder";

interface DispatchButtonProps {
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
}

export function DispatchButton({ ticket, swiMatch }: DispatchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (dispatched) {
    return (
      <div className="flex items-center gap-2 text-sm text-optimal font-medium py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Dispatched</span>
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
        <FileText className="h-3.5 w-3.5" />
        Create Estimate
      </Button>
      <EstimateBuilder
        open={isOpen}
        onOpenChange={setIsOpen}
        ticket={ticket}
        swiMatch={swiMatch}
        onDispatched={() => { setDispatched(true); setIsOpen(false); }}
      />
    </>
  );
}
