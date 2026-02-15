import { useState } from "react";
import { Send, Clock, User, MapPin, Wrench, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { toast } from "sonner";

interface DispatchButtonProps {
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
}

const TECHNICIANS = [
  { id: "tech-1", name: "John Martinez" },
  { id: "tech-2", name: "Sarah Chen" },
  { id: "tech-3", name: "Mike Thompson" },
  { id: "tech-4", name: "Lisa Rodriguez" },
];

export function DispatchButton({ ticket, swiMatch }: DispatchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState("");
  const [notes, setNotes] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const estimatedTime = swiMatch.swiDocument?.estimatedTime || swiMatch.estimated_service_time || "1-2 hours";
  const requiredParts = swiMatch.swiDocument?.requiredParts || swiMatch.required_parts || [];
  const swiTitle = swiMatch.swiDocument?.title || swiMatch.matched_swi_id || "General Service";

  const handleDispatch = async () => {
    if (!selectedTech) {
      toast.error("Please assign a technician");
      return;
    }
    setIsDispatching(true);

    // Simulate dispatch (replace with real API call)
    await new Promise((r) => setTimeout(r, 1200));

    const techName = TECHNICIANS.find((t) => t.id === selectedTech)?.name;
    toast.success(`Work order dispatched to ${techName}`, {
      description: `${ticket.assetName} — ${swiTitle}`,
    });

    setDispatched(true);
    setIsDispatching(false);
    setIsOpen(false);
  };

  if (dispatched) {
    return (
      <div className="flex items-center gap-2 text-sm text-optimal font-medium py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Dispatched — {TECHNICIANS.find((t) => t.id === selectedTech)?.name}</span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Send className="h-3.5 w-3.5" />
        Dispatch Work Order
      </Button>
    );
  }

  return (
    <div
      className="mt-2 border border-border rounded-lg p-4 bg-card space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Dispatch Work Order
        </h5>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Wrench className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">SWI</p>
            <p className="font-medium text-foreground">{swiTitle}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Est. Time</p>
            <p className="font-medium text-foreground">{estimatedTime}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium text-foreground">{ticket.city || "Unknown"}, {ticket.state || ""}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Confidence</p>
          <Badge className={swiMatch.confidence >= 90 ? "bg-optimal text-optimal-foreground" : "bg-degraded text-degraded-foreground"}>
            {swiMatch.confidence}%
          </Badge>
        </div>
      </div>

      {requiredParts.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Required Parts</p>
          <div className="flex flex-wrap gap-1">
            {requiredParts.map((part, i) => (
              <Badge key={i} variant="outline" className="text-xs">{part}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Technician + Notes */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">
            <User className="h-3 w-3 inline mr-1" />Assign Technician
          </label>
          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {TECHNICIANS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions..."
            className="h-9"
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={handleDispatch} disabled={isDispatching} className="gap-2">
          {isDispatching ? (
            <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {isDispatching ? "Dispatching..." : "Dispatch"}
        </Button>
      </div>
    </div>
  );
}
