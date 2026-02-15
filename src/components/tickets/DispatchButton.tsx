import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { DispatchModal } from "./DispatchModal";

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
        <span>Sent to Jobber</span>
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
        <Send className="h-3.5 w-3.5" />
        Dispatch to Jobber
      </Button>
      <DispatchModal
        open={isOpen}
        onOpenChange={setIsOpen}
        ticket={ticket}
        swiMatch={swiMatch}
        onDispatched={() => { setDispatched(true); setIsOpen(false); }}
      />
    </>
  );
}
