import { useState, useEffect } from "react";
import type { ChargerBrand } from "@/types/ticket";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceTicket } from "@/types/serviceTicket";
import { AutoHealResult, AgentStep, runAutoHealAssessment } from "@/services/autoHealService";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useTicketLifecycle,
  rpcRerunAssessment,
  rpcRevertRejection,
  canOverrideTicketLifecycle,
} from "@/hooks/useTicketLifecycle";
import {
  User, Building2, Mail, Phone, MapPin, Wrench, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, XCircle,
  Brain, Zap, Save, Plus, MessageSquare, Pencil, X, RefreshCw, Undo2, ShieldAlert,
} from "lucide-react";
import { NeuralLayerPill } from "@/components/business/NeuralLayerPill";

interface TicketReviewPanelProps {
  ticket: ServiceTicket;
  onApprove: (ticketId: string, result: AutoHealResult, notes: string) => void;
  onReject: (ticketId: string, reason: string) => void;
  onUpdate: (ticketId: string, updates: Partial<ServiceTicket>) => void;
  onCollapse: () => void;
}

type ProgressStep = AgentStep;

const SOURCE_LABELS: Record<string, string> = {
  campaign: "Campaign",
  noch_plus: "Noch+ Submission",
  manual: "Manual Entry",
};

export function TicketReviewPanel({ ticket, onApprove, onReject, onUpdate, onCollapse }: TicketReviewPanelProps) {
  const { role } = useUserRole();
  const canOverride = canOverrideTicketLifecycle(role);

  // Live, server-truth lifecycle state — overrides any stale Zustand value
  const { row: lifecycle, refetch } = useTicketLifecycle(ticket.id);
  const status = lifecycle?.assessment_status ?? "pending_review";

  // Editable fields
  const [customerName, setCustomerName] = useState(ticket.customer.name);
  const [customerCompany, setCustomerCompany] = useState(ticket.customer.company);
  const [customerEmail, setCustomerEmail] = useState(ticket.customer.email);
  const [customerPhone, setCustomerPhone] = useState(ticket.customer.phone);
  const [customerAddress, setCustomerAddress] = useState(ticket.customer.address);
  const [chargerBrand, setChargerBrand] = useState(ticket.charger.brand || "");
  const [chargerSerial, setChargerSerial] = useState(ticket.charger.serialNumber);
  const [chargerLocation, setChargerLocation] = useState(ticket.charger.location);
  const [issueDescription, setIssueDescription] = useState(ticket.issue.description);

  // Comments / notes
  const [notes, setNotes] = useState(ticket.reviewNotes || "");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Array<{ text: string; timestamp: string; author: string }>>(
    ticket.history
      .filter(h => h.action.startsWith("Comment:"))
      .map(h => ({ text: h.action.replace("Comment: ", ""), timestamp: h.timestamp, author: h.performedBy }))
  );

  // Global editing mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSaveCheck, setShowSaveCheck] = useState(false);

  // Reject / approve / revert / rerun flow
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revertOpen, setRevertOpen] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [rerunConfirmOpen, setRerunConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refetch fresh on mount/ticket change to defeat stale cache
  useEffect(() => { refetch(); }, [refetch]);

  const handleSaveChanges = () => {
    onUpdate(ticket.id, {
      customer: {
        ...ticket.customer,
        name: customerName, company: customerCompany, email: customerEmail,
        phone: customerPhone, address: customerAddress,
      },
      charger: {
        ...ticket.charger,
        brand: (chargerBrand || "") as ChargerBrand | "",
        serialNumber: chargerSerial, location: chargerLocation,
      },
      issue: { ...ticket.issue, description: issueDescription },
      reviewNotes: notes || undefined,
      updatedAt: new Date().toISOString(),
    });
    setIsEditMode(false);
    setShowSaveCheck(true);
    setTimeout(() => setShowSaveCheck(false), 1500);
    toast.success("Changes saved");
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = { text: newComment.trim(), timestamp: new Date().toISOString(), author: "Account Manager" };
    setComments(prev => [...prev, comment]);
    onUpdate(ticket.id, {
      history: [...ticket.history, { id: `h-${Date.now()}`, timestamp: comment.timestamp, action: `Comment: ${comment.text}`, performedBy: comment.author }],
    });
    setNewComment("");
    toast.success("Comment added");
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    onReject(ticket.id, rejectReason.trim());
    setRejectOpen(false);
  };

  const handleRevertConfirm = async () => {
    if (!revertReason.trim()) {
      toast.error("Please explain why you're reverting this rejection");
      return;
    }
    try {
      await rpcRevertRejection(ticket.id, revertReason.trim());
      toast.success("Rejection reverted — ticket back to pending review");
      setRevertOpen(false);
      setRevertReason("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not revert rejection");
    }
  };

  const runAssessment = async (mode: "approve" | "rerun") => {
    setRerunConfirmOpen(false);
    if (mode === "approve" && isEditMode) handleSaveChanges();

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
          serialNumber: chargerSerial,
          chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
          issueDescription,
          priority: ticket.priority,
          customerName, customerCompany,
          photoCount: ticket.photos.length,
          notes: notes.trim() || undefined,
        },
        updateStep, handleStepUpdate,
      );

      setProgressSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
      await new Promise(r => setTimeout(r, 600));

      if (mode === "rerun") {
        // Server-enforced re-run via RPC (also clears send state per business rule)
        await rpcRerunAssessment(ticket.id, {
          assessment_data: result.assessment as any,
          swi_match_data: result.swiMatch as any,
        });
        toast.success("Assessment re-run complete — send state reset");
        // Mirror to local store so UI reflects new assessment instantly
        onUpdate(ticket.id, {
          assessmentData: result.assessment as any,
          swiMatchData: result.swiMatch as any,
          updatedAt: new Date().toISOString(),
        });
        setIsProcessing(false);
        await refetch();
      } else {
        setIsProcessing(false);
        await new Promise(r => setTimeout(r, 100));
        // Parent handler calls approve_and_run_assessment RPC + advances workflow
        onApprove(ticket.id, result, notes.trim());
      }
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

  const handleRetry = () => { setError(null); runAssessment("approve"); };

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Review Ticket {ticket.ticketId}
          {status === "assessed" && (
            <>
              <Badge className="bg-optimal/10 text-optimal border-optimal/20">Assessed</Badge>
              <span className="text-[11px] font-normal text-muted-foreground">
                Confidence: 87%
              </span>
            </>
          )}
          {status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
          {status === "pending_review" && (
            <>
              {showSaveCheck ? (
                <CheckCircle className="h-4 w-4 text-optimal animate-in fade-in duration-200" />
              ) : (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`p-1 rounded hover:bg-muted transition-colors ${isEditMode ? "text-primary" : "text-muted-foreground"}`}
                  title={isEditMode ? "Exit edit mode" : "Edit ticket"}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isEditMode && (
                <Button size="sm" variant="outline" onClick={handleSaveChanges} className="h-6 px-2 text-xs gap-1 ml-1">
                  <Save className="h-3 w-3" /> Save
                </Button>
              )}
            </>
          )}
        </h3>
        <Button size="sm" variant="ghost" onClick={onCollapse}><X className="h-4 w-4" /></Button>
      </div>

      {/* Status banners */}
      {status === "rejected" && lifecycle && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Rejected{lifecycle.rejected_at ? ` on ${format(new Date(lifecycle.rejected_at), "MMM d, yyyy h:mm a")}` : ""}
          </div>
          {lifecycle.rejection_reason && (
            <p className="text-sm text-foreground"><span className="text-muted-foreground">Reason:</span> {lifecycle.rejection_reason}</p>
          )}
          {canOverride && (
            <Button size="sm" variant="outline" className="gap-1.5 mt-2" onClick={() => setRevertOpen(true)}>
              <Undo2 className="h-3.5 w-3.5" /> Revert Rejection
            </Button>
          )}
        </div>
      )}

      {status === "assessed" && lifecycle && (
        <div className="rounded-lg border border-optimal/30 bg-optimal/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-optimal">
            <CheckCircle className="h-4 w-4" />
            Assessed{lifecycle.assessed_at ? ` on ${format(new Date(lifecycle.assessed_at), "MMM d, yyyy h:mm a")}` : ""}
          </div>
          {lifecycle.assessment_data?.recommendation && (
            <p className="text-sm text-foreground"><span className="text-muted-foreground">Recommendation:</span> {lifecycle.assessment_data.recommendation}</p>
          )}
          <div>
            <NeuralLayerPill layer="reasoning" tooltip="Generated by Cortex agent · AI Triage layer" />
          </div>
          {canOverride && (
            <Button size="sm" variant="outline" className="gap-1.5 mt-2" onClick={() => setRerunConfirmOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Re-run Assessment
            </Button>
          )}
        </div>
      )}

      {/* Editable details — only when pending */}
      {status === "pending_review" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionHeader title="Customer Information" icon={User}>
              {isEditMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EditField label="Name" value={customerName} onChange={setCustomerName} />
                  <EditField label="Company" value={customerCompany} onChange={setCustomerCompany} />
                  <EditField label="Email" value={customerEmail} onChange={setCustomerEmail} />
                  <EditField label="Phone" value={customerPhone} onChange={setCustomerPhone} />
                  <EditField label="Address" value={customerAddress} onChange={setCustomerAddress} className="sm:col-span-2" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Name" value={customerName} />
                  <InfoRow label="Company" value={customerCompany} />
                  <InfoRow label="Email" value={customerEmail} />
                  <InfoRow label="Phone" value={customerPhone} />
                  <InfoRow label="Address" value={customerAddress} className="sm:col-span-2" />
                </div>
              )}
            </SectionHeader>

            <SectionHeader title="Charger Information" icon={Zap}>
              {isEditMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EditField label="Brand" value={chargerBrand} onChange={setChargerBrand} />
                  <EditField label="Serial Number" value={chargerSerial} onChange={setChargerSerial} />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <p className="text-sm font-medium">{ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2"}</p>
                  </div>
                  <EditField label="Location" value={chargerLocation} onChange={setChargerLocation} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Brand" value={chargerBrand || "—"} />
                  <InfoRow label="Serial" value={chargerSerial} />
                  <InfoRow label="Type" value={ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2"} />
                  <InfoRow label="Location" value={chargerLocation} />
                </div>
              )}
            </SectionHeader>

            <SectionHeader title="Issue Description" icon={AlertTriangle}>
              {isEditMode ? (
                <Textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} className="min-h-[80px] text-sm" />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{issueDescription}</p>
              )}
            </SectionHeader>

            <SectionHeader title={`Photos (${ticket.photos.length})`} icon={ImageIcon}>
              {ticket.photos.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /><span>No photos uploaded</span>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {ticket.photos.map((p) => (
                    <div key={p.id} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  ))}
                </div>
              )}
            </SectionHeader>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/50 rounded-lg p-3">
            <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{SOURCE_LABELS[ticket.source]}</span></div>
            {ticket.sourceCampaignName && <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{ticket.sourceCampaignName}</span></div>}
            <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span></div>
            {ticket.assignedTo && <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{ticket.assignedTo}</span></div>}
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Comments & Notes
            </h4>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes about this ticket..." className="min-h-[60px] text-sm" />
            {comments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c, i) => (
                  <div key={i} className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-xs">{c.author}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.timestamp), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="text-sm"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              />
              <Button size="sm" variant="outline" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Actions: Approve / Reject only available when pending */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={onCollapse}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>Reject</Button>
            <Button size="sm" onClick={() => runAssessment("approve")} className="gap-2">
              <Brain className="h-4 w-4" /> Approve & Run Assessment
            </Button>
          </div>
        </>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you rejecting this ticket?</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for the rejection. This will be visible to all staff.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Rejection</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Rejection Dialog */}
      <AlertDialog open={revertOpen} onOpenChange={setRevertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Explain why this rejection should be reversed. The original rejection will remain in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={revertReason} onChange={(e) => setRevertReason(e.target.value)} placeholder="Explain why you're reverting..." className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevertConfirm}>Confirm Revert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-run Confirm */}
      <AlertDialog open={rerunConfirmOpen} onOpenChange={setRerunConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-run Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the existing assessment and reset the customer-send state. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAssessment("rerun")}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing Modal */}
      <Dialog open={isProcessing} onOpenChange={(open) => { if (!open && !error) return; if (!open) setIsProcessing(false); }}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {error ? <XCircle className="h-5 w-5 text-critical" /> : <Brain className="h-5 w-5 text-primary animate-pulse" />}
              {error ? "Assessment Failed" : "Running Neural OS Assessment..."}
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
                  <Button size="sm" onClick={handleRetry} className="gap-1.5"><Loader2 className="h-3.5 w-3.5" /> Retry</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeader({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {title}
      </h4>
      {children}
    </div>
  );
}

function EditField({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function InfoRow({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
