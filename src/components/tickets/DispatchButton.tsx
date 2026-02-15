import { useState } from "react";
import { Send, Clock, MapPin, Wrench, CheckCircle, X, ClipboardCopy, ExternalLink, Building } from "lucide-react";
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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function DispatchButton({ ticket, swiMatch }: DispatchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const estimatedTime = swiMatch.swiDocument?.estimatedTime || swiMatch.estimated_service_time || "1-2 hours";
  const requiredParts = swiMatch.swiDocument?.requiredParts || swiMatch.required_parts || [];
  const swiTitle = swiMatch.swiDocument?.title || swiMatch.matched_swi_id || "General Service";

  // Customer info state pre-filled from ticket
  const [companyName, setCompanyName] = useState(ticket.accountName || "");
  const [streetAddress, setStreetAddress] = useState(ticket.address || "");
  const [city, setCity] = useState(ticket.city || "");
  const [state, setState] = useState(ticket.state || "");
  const [zip, setZip] = useState(ticket.zip || "");
  const [notes, setNotes] = useState("");

  const buildDescription = () => {
    const parts = requiredParts.length > 0 ? `Required Parts: ${requiredParts.join(", ")}` : "";
    return [
      `Service Work Order`,
      `Asset: ${ticket.assetName}`,
      `Company: ${companyName}`,
      `Location: ${streetAddress}, ${city}, ${state} ${zip}`.trim(),
      `SWI: ${swiTitle}`,
      `Est. Time: ${estimatedTime}`,
      parts,
      notes ? `Notes: ${notes}` : "",
    ].filter(Boolean).join("\n");
  };

  const handleCopyAndOpenJobber = async () => {
    try {
      await navigator.clipboard.writeText(buildDescription());
      toast.success("Description copied! Paste it into the Jobber form");
      window.open("https://secure.getjobber.com/work_requests/new", "_blank");
      setDispatched(true);
      setIsOpen(false);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (dispatched) {
    return (
      <div className="flex items-center gap-2 text-sm text-optimal font-medium py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Sent to Jobber</span>
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

      {/* Service Summary */}
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
            <p className="font-medium text-foreground">{city || "Unknown"}, {state || ""}</p>
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

      {/* Customer Information */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          Customer Information
        </p>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Company Name</label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9" maxLength={200} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Street Address</label>
          <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="h-9" maxLength={300} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-9" maxLength={100} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">State</label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ZIP Code</label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} className="h-9" maxLength={10} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." className="h-9" maxLength={500} />
        </div>
      </div>

      {/* Instructions */}
      <div className="border border-border rounded-md p-3 bg-muted/30 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm">How to dispatch:</p>
        <p><span className="font-semibold text-foreground">Step 1:</span> Confirm customer info above, then click "Copy & Open Jobber"</p>
        <p><span className="font-semibold text-foreground">Step 2:</span> Paste the description into the Jobber service request form</p>
        <p><span className="font-semibold text-foreground">Step 3:</span> Submit the form in Jobber</p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={handleCopyAndOpenJobber} className="gap-2">
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copy & Open Jobber
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
