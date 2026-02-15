import { useState } from "react";
import { Copy, Check, ExternalLink, ClipboardCopy, Square, CheckSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { toast } from "sonner";

interface DispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
  onDispatched: () => void;
}

interface CopyFieldProps {
  label: string;
  value: string;
}

function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-muted/50 border border-border rounded px-2.5 py-1.5 text-sm font-medium text-foreground select-all truncate">
        {value || "—"}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy} disabled={!value}>
        {copied ? <Check className="h-3.5 w-3.5 text-optimal" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function DispatchModal({ open, onOpenChange, ticket, swiMatch, onDispatched }: DispatchModalProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const swiTitle = swiMatch.swiDocument?.title || swiMatch.matched_swi_id || "General Service";
  const estimatedTime = swiMatch.swiDocument?.estimatedTime || swiMatch.estimated_service_time || "1-2 hours";
  const requiredParts = swiMatch.swiDocument?.requiredParts || swiMatch.required_parts || [];

  const contactFields = [
    { label: "First name", value: "Fernando" },
    { label: "Last name", value: "Favole" },
    { label: "Company", value: ticket.accountName || "" },
    { label: "Email", value: "ffavole@nochpower.com" },
    { label: "Phone", value: "(949) 870-5030" },
    { label: "Address", value: [ticket.address, ticket.city, ticket.state, ticket.zip].filter(Boolean).join(", ") },
  ];

  const serviceDescription = [
    `Service Work Order`,
    `Asset: ${ticket.assetName}`,
    `Company: ${ticket.accountName || ""}`,
    `Location: ${[ticket.address, ticket.city, ticket.state, ticket.zip].filter(Boolean).join(", ")}`,
    `SWI: ${swiTitle}`,
    `Est. Time: ${estimatedTime}`,
    requiredParts.length > 0 ? `Required Parts: ${requiredParts.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const toggleStep = (step: number) => setCheckedSteps((p) => ({ ...p, [step]: !p[step] }));

  const handleCopyAllAndOpen = async () => {
    try {
      const allData = {
        contact: Object.fromEntries(contactFields.map((f) => [f.label, f.value])),
        serviceDescription,
      };
      await navigator.clipboard.writeText(JSON.stringify(allData, null, 2));
      toast.success("Data copied! Fill the Jobber form step by step");
      window.open("https://secure.getjobber.com/work_requests/new", "_blank");
      onDispatched();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyDescription = async () => {
    await navigator.clipboard.writeText(serviceDescription);
    toast.success("Service description copied!");
  };

  const StepCheck = ({ step }: { step: number }) => (
    <button onClick={() => toggleStep(step)} className="shrink-0 text-primary">
      {checkedSteps[step] ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Dispatch to Jobber
            <Badge variant="outline" className="text-xs font-normal">{ticket.assetName}</Badge>
          </DialogTitle>
          <DialogDescription>Copy each field into the Jobber form, or use "Copy All" below.</DialogDescription>
        </DialogHeader>

        {/* Step 1: Contact */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepCheck step={1} />
            <h4 className="text-sm font-semibold text-foreground">STEP 1: Contact Information</h4>
          </div>
          <div className="space-y-1.5 pl-6">
            {contactFields.map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </div>

        {/* Step 2: Service Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepCheck step={2} />
            <h4 className="text-sm font-semibold text-foreground">STEP 2: Service Details</h4>
          </div>
          <div className="pl-6 space-y-2">
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded p-3 text-xs text-foreground whitespace-pre-wrap select-all leading-relaxed">
                {serviceDescription}
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
                onClick={handleCopyDescription}
              >
                <Copy className="h-3 w-3" />
                Copy All
              </Button>
            </div>
          </div>
        </div>

        {/* Step 3: Submit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepCheck step={3} />
            <h4 className="text-sm font-semibold text-foreground">STEP 3: Submit in Jobber</h4>
          </div>
          <p className="text-xs text-muted-foreground pl-6">Click "Confirm" in the Jobber form after pasting all fields.</p>
        </div>

        {/* Smart Paste Helper */}
        <div className="border border-border rounded-md p-3 bg-muted/20 space-y-1">
          <p className="text-xs font-semibold text-foreground">💡 Smart Paste Helper</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Page 1:</span> Use individual copy buttons above for each contact field.
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Page 2:</span> Copy the service description block and paste into the details field.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleCopyAllAndOpen} className="gap-2">
            <ClipboardCopy className="h-3.5 w-3.5" />
            Copy All & Open Jobber
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
