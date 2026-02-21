import { useState } from "react";
import type { ChargerBrand } from "@/types/ticket";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceTicket } from "@/types/serviceTicket";
import { AutoHealResult, runAutoHealAssessment } from "@/services/autoHealService";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  User, Building2, Mail, Phone, MapPin, Wrench, FileText,
  Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, XCircle,
  Brain, Zap, Save, Plus, MessageSquare, Pencil, X,
} from "lucide-react";

interface TicketReviewPanelProps {
  ticket: ServiceTicket;
  onApprove: (ticketId: string, result: AutoHealResult, notes: string) => void;
  onReject: (ticketId: string, reason: string) => void;
  onUpdate: (ticketId: string, updates: Partial<ServiceTicket>) => void;
  onCollapse: () => void;
}

type ProgressStep = { label: string; status: "pending" | "running" | "done" | "error" };

const SOURCE_LABELS: Record<string, string> = {
  campaign: "Campaign",
  noch_plus: "Noch+ Submission",
  manual: "Manual Entry",
};

export function TicketReviewPanel({ ticket, onApprove, onReject, onUpdate, onCollapse }: TicketReviewPanelProps) {
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

  // Reject / approve flow
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  

  const handleSaveChanges = () => {
    onUpdate(ticket.id, {
      customer: {
        ...ticket.customer,
        name: customerName,
        company: customerCompany,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
      },
      charger: {
        ...ticket.charger,
        brand: (chargerBrand || "") as ChargerBrand | "",
        serialNumber: chargerSerial,
        location: chargerLocation,
      },
      issue: {
        ...ticket.issue,
        description: issueDescription,
      },
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
    // Persist comment in ticket history
    const historyEntry = {
      id: `h-${Date.now()}`,
      timestamp: comment.timestamp,
      action: `Comment: ${comment.text}`,
      performedBy: comment.author,
    };
    onUpdate(ticket.id, {
      history: [...ticket.history, historyEntry],
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
    toast.success("Ticket rejected");
  };

  const handleApproveConfirm = async () => {
    setApproveConfirmOpen(false);
    // Save any pending edits first
    if (isEditMode) handleSaveChanges();

    setIsProcessing(true);
    setError(null);

    const steps: ProgressStep[] = [
      { label: "Analyzing ticket data...", status: "pending" },
      { label: "Querying BTC database...", status: "pending" },
      { label: "Generating assessment...", status: "pending" },
      { label: "Matching SWI...", status: "pending" },
    ];
    setProgressSteps([...steps]);

    const updateStep = (label: string) => {
      setProgressSteps(prev => {
        const next = [...prev];
        const runningIdx = next.findIndex(s => s.status === "running");
        if (runningIdx >= 0) next[runningIdx].status = "done";
        const targetIdx = next.findIndex(s => s.label.startsWith(label.split("...")[0]));
        if (targetIdx >= 0) next[targetIdx].status = "running";
        return next;
      });
    };

    try {
      const result = await runAutoHealAssessment(
        {
          ticketId: ticket.ticketId,
          serialNumber: chargerSerial,
          chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
          issueDescription: issueDescription,
          priority: ticket.priority,
          customerName: customerName,
          customerCompany: customerCompany,
          photoCount: ticket.photos.length,
          notes: notes.trim() || undefined,
        },
        updateStep,
      );

      setProgressSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
      await new Promise(r => setTimeout(r, 500));

      onApprove(ticket.id, result, notes.trim());
      toast.success("Assessment complete");
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
    const fallbackResult: AutoHealResult = {
      assessment: {
        riskLevel: ticket.priority as any,
        assessmentText: `Manual approval without AI assessment. Issue: ${issueDescription}`,
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
  };

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Review Ticket {ticket.ticketId}
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
        </h3>
        <Button size="sm" variant="ghost" onClick={onCollapse} className="text-xs">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer Information */}
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

        {/* Charger Information */}
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

        {/* Issue Description */}
        <SectionHeader title="Issue Description" icon={AlertTriangle}>
          {isEditMode ? (
            <Textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{issueDescription}</p>
          )}
        </SectionHeader>

        {/* Photos */}
        <SectionHeader title={`Photos (${ticket.photos.length})`} icon={ImageIcon}>
          {ticket.photos.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>No photos uploaded</span>
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
          <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Photos
          </Button>
        </SectionHeader>
      </div>

      {/* Source Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/50 rounded-lg p-3">
        <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{SOURCE_LABELS[ticket.source]}</span></div>
        {ticket.sourceCampaignName && <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{ticket.sourceCampaignName}</span></div>}
        <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span></div>
        {ticket.assignedTo && <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{ticket.assignedTo}</span></div>}
      </div>

      {/* Comments Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Comments & Notes
        </h4>

        {/* AM Notes */}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this ticket..."
          className="min-h-[60px] text-sm"
        />

        {/* Comment thread */}
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

        {/* Add comment */}
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

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCollapse}>Cancel</Button>
        <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>Reject</Button>
        <Button size="sm" onClick={() => setApproveConfirmOpen(true)} className="gap-2">
          <Brain className="h-4 w-4" /> Approve & Run Assessment
        </Button>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you rejecting this ticket?</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for the rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="min-h-[80px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Rejection</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Confirm */}
      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run AutoHeal Assessment?</AlertDialogTitle>
            <AlertDialogDescription>This will trigger AutoHeal assessment using ticket data and BTC database. Continue?</AlertDialogDescription>
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
                  <Button size="sm" onClick={handleRetry} className="gap-1.5"><Loader2 className="h-3.5 w-3.5" /> Retry</Button>
                  <Button variant="outline" size="sm" onClick={handleContinueWithout}>Continue Without Assessment</Button>
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
