import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTicket } from "@/types/serviceTicket";
import { AutoHealResult, AgentStep, runAutoHealAssessment } from "@/services/autoHealService";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  User, Building2, Mail, Phone, MapPin, Wrench, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, XCircle,
  Shield, Clock, Brain, Zap,
} from "lucide-react";

interface TicketReviewModalProps {
  ticket: ServiceTicket | null;
  open: boolean;
  onClose: () => void;
  onApprove: (ticketId: string, result: AutoHealResult, notes: string) => void;
  onReject: (ticketId: string, reason: string) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-medium text-medium-foreground",
  Low: "bg-optimal text-optimal-foreground",
};

const SOURCE_LABELS: Record<string, string> = {
  campaign: "Campaign",
  noch_plus: "Noch+ Submission",
  manual: "Manual Entry",
};

type ProgressStep = AgentStep;

export function TicketReviewModal({ ticket, open, onClose, onApprove, onReject }: TicketReviewModalProps) {
  const [notes, setNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setNotes("");
    setRejectReason("");
    setRejectOpen(false);
    setApproveConfirmOpen(false);
    setIsProcessing(false);
    setProgressSteps([]);
    setError(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleRejectConfirm = () => {
    if (!ticket) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    onReject(ticket.id, rejectReason.trim());
    toast.success("Ticket rejected");
    resetState();
    onClose();
  };

  const handleApproveConfirm = async () => {
    if (!ticket) return;
    setApproveConfirmOpen(false);
    setIsProcessing(true);
    setError(null);

    const steps: ProgressStep[] = [
      { agentId: "intake-validator", label: "Validating ticket data...", status: "pending" },
      { agentId: "diagnostic-agent", label: "Running diagnostics...", status: "pending" },
      { agentId: "swi-matcher", label: "Matching SWI documents...", status: "pending" },
      { agentId: "resolution-agent", label: "Generating resolution...", status: "pending" },
      { agentId: "learning-agent", label: "Processing learning patterns...", status: "pending" },
      { agentId: "validation-agent", label: "Running quality validation...", status: "pending" },
    ];
    setProgressSteps([...steps]);

    const updateStep = (label: string) => {
      setProgressSteps(prev => {
        const next = [...prev];
        const runningIdx = next.findIndex(s => s.status === "running");
        if (runningIdx >= 0) next[runningIdx].status = "done";
        const targetIdx = next.findIndex(s => s.label.toLowerCase().includes(label.split("...")[0].toLowerCase()));
        if (targetIdx >= 0) next[targetIdx].status = "running";
        return next;
      });
    };

    const handleStepUpdate = (updatedSteps: AgentStep[]) => {
      setProgressSteps(updatedSteps.map(s => ({ ...s, label: s.label + "..." })));
    };

    try {
      const result = await runAutoHealAssessment(
        {
          ticketId: ticket.ticketId,
          serialNumber: ticket.charger.serialNumber,
          chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
          issueDescription: ticket.issue.description,
          priority: ticket.priority,
          customerName: ticket.customer.name,
          customerCompany: ticket.customer.company,
          photoCount: ticket.photos.length,
          notes: notes.trim() || undefined,
        },
        updateStep,
        handleStepUpdate,
      );

      // Mark all done
      setProgressSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
      await new Promise(r => setTimeout(r, 500));

      onApprove(ticket.id, result, notes.trim());
      toast.success("Assessment complete");
      resetState();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setProgressSteps(prev => {
        const next = [...prev];
        const runningIdx = next.findIndex(s => s.status === "running");
        if (runningIdx >= 0) next[runningIdx].status = "error";
        return next;
      });
    }
  };

  const handleRetry = () => {
    setError(null);
    handleApproveConfirm();
  };

  const handleContinueWithout = () => {
    if (!ticket) return;
    const fallbackResult: AutoHealResult = {
      assessment: {
        riskLevel: ticket.priority as any,
        assessmentText: `Manual approval without AI assessment. Issue: ${ticket.issue.description}`,
        recommendation: "Schedule on-site diagnostic to evaluate reported issue.",
        chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
        warrantyNotes: [],
        dataSources: ["Customer submission"],
        timestamp: new Date().toISOString(),
        btcData: null,
      },
      swiMatch: null,
    };
    onApprove(ticket.id, fallbackResult, notes.trim());
    toast.success("Ticket approved (without AI assessment)");
    resetState();
    onClose();
  };

  if (!ticket) return null;

  return (
    <>
      <Dialog open={open && !isProcessing} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle>Review Ticket {ticket.ticketId}</DialogTitle>
              <Badge className={PRIORITY_STYLES[ticket.priority]}>{ticket.priority}</Badge>
              <Badge variant="outline">{SOURCE_LABELS[ticket.source]}</Badge>
            </div>
            <DialogDescription>Review intake data and approve for AutoHeal assessment or reject.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Customer Info */}
            <Section title="Customer Information" icon={User}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={User} label="Name" value={ticket.customer.name} />
                <InfoRow icon={Building2} label="Company" value={ticket.customer.company} />
                <InfoRow icon={Mail} label="Email" value={ticket.customer.email} />
                <InfoRow icon={Phone} label="Phone" value={ticket.customer.phone} />
                <InfoRow icon={MapPin} label="Address" value={ticket.customer.address} className="sm:col-span-2" />
              </div>
            </Section>

            {/* Charger Info */}
            <Section title="Charger Information" icon={Zap}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Wrench} label="Brand" value={ticket.charger.brand || "—"} />
                <InfoRow icon={FileText} label="Serial Number" value={ticket.charger.serialNumber} />
                <InfoRow icon={Zap} label="Type" value={ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2"} />
                <InfoRow icon={MapPin} label="Location" value={ticket.charger.location} />
              </div>
            </Section>

            {/* Photos */}
            <Section title={`Photos (${ticket.photos.length})`} icon={ImageIcon}>
              {ticket.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos uploaded</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {ticket.photos.map((p) => (
                    <div key={p.id} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Issue */}
            <Section title="Issue Description" icon={AlertTriangle}>
              <p className="text-sm text-muted-foreground leading-relaxed">{ticket.issue.description}</p>
            </Section>

            {/* Source Metadata */}
            <Section title="Source Metadata" icon={FileText}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{SOURCE_LABELS[ticket.source]}</span></div>
                {ticket.sourceCampaignName && <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{ticket.sourceCampaignName}</span></div>}
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span></div>
                {ticket.assignedTo && <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{ticket.assignedTo}</span></div>}
              </div>
            </Section>

            {/* AM Notes */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Account Manager Notes
              </h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this ticket before approving..."
                className="min-h-[80px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
              <Button onClick={() => setApproveConfirmOpen(true)} className="gap-2">
                <Brain className="h-4 w-4" /> Approve & Run Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you rejecting this ticket?</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for the rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason..."
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirm */}
      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run AutoHeal Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger AutoHeal assessment using ticket data and BTC database. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing Modal */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {error ? <XCircle className="h-5 w-5 text-critical" /> : <Brain className="h-5 w-5 text-primary animate-pulse" />}
              {error ? "Assessment Failed" : "🤖 Running AutoHeal Assessment..."}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {progressSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.status === "done" && <CheckCircle className="h-5 w-5 text-optimal flex-shrink-0" />}
                {step.status === "running" && <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />}
                {step.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />}
                {step.status === "error" && <XCircle className="h-5 w-5 text-critical flex-shrink-0" />}
                <span className={`text-sm ${step.status === "pending" ? "text-muted-foreground" : step.status === "error" ? "text-critical" : "text-foreground"}`}>
                  {step.label}
                </span>
              </div>
            ))}
            {error && (
              <div className="mt-4 p-3 bg-critical/5 border border-critical/20 rounded-lg">
                <p className="text-sm text-critical">{error}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleRetry} className="gap-1.5">
                    <Loader2 className="h-3.5 w-3.5" /> Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleContinueWithout}>
                    Continue Without Assessment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" /> {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className = "" }: { icon: React.ElementType; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
