import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import type { Escalation } from "@/hooks/useCampaignLaunch";
import { PromptDialog } from "@/components/ui/prompt-dialog";

interface Props {
  escalations: Escalation[];
  campaignId: string;
  onCreateEscalation: (esc: Omit<Escalation, "id" | "created_at" | "updated_at">) => void;
  onUpdateEscalation: (params: { id: string; campaignId: string; status?: string; resolution_notes?: string; assigned_to?: string }) => void;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; className: string }> = {
  critical: { icon: <ShieldAlert className="h-3.5 w-3.5" />, className: "bg-red-500/20 text-red-400 border-red-500/30" },
  warning: { icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  info: { icon: <Info className="h-3.5 w-3.5" />, className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const ISSUE_TYPES = [
  "Parts Needed", "Site Access Denied", "Charger Not Found",
  "Electrical Issue", "Operator Credentials Required", "Customer Coordination Needed", "Other",
];

export function LaunchEscalationsTab({ escalations, campaignId, onCreateEscalation, onUpdateEscalation }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [formSeverity, setFormSeverity] = useState("warning");
  const [formSite, setFormSite] = useState("");
  const [formChargerId, setFormChargerId] = useState("");
  const [formIssueType, setFormIssueType] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [resolveTarget, setResolveTarget] = useState<Escalation | null>(null);

  const open = escalations.filter(e => e.status === "open");
  const inProgress = escalations.filter(e => e.status === "in_progress");
  const resolved = escalations.filter(e => e.status === "resolved");

  function handleCreate() {
    if (!formIssueType) {
      toast.error("Please select an issue type");
      return;
    }
    onCreateEscalation({
      campaign_id: campaignId,
      site_name: formSite,
      charger_id: formChargerId,
      severity: formSeverity,
      issue_type: formIssueType,
      description: formDescription,
      assigned_to: "",
      status: "open",
      resolution_notes: "",
    });
    setShowModal(false);
    setFormSeverity("warning");
    setFormSite("");
    setFormChargerId("");
    setFormIssueType("");
    setFormDescription("");
    toast.success("Escalation created");
  }

  function renderCard(esc: Escalation) {
    const sev = SEVERITY_CONFIG[esc.severity] || SEVERITY_CONFIG.info;
    return (
      <Card key={esc.id}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`gap-1 ${sev.className}`}>
                {sev.icon} {esc.severity}
              </Badge>
              <span className="text-sm font-medium">{esc.issue_type}</span>
            </div>
            <Badge variant="outline" className="text-xs capitalize">{esc.status.replace("_", " ")}</Badge>
          </div>
          {esc.site_name && (
            <div className="text-xs text-muted-foreground">{esc.site_name}{esc.charger_id && ` · ${esc.charger_id}`}</div>
          )}
          {esc.description && <p className="text-sm">{esc.description}</p>}
          {esc.assigned_to && (
            <div className="text-xs text-muted-foreground">Assigned to: {esc.assigned_to}</div>
          )}
          {esc.resolution_notes && (
            <div className="text-xs border-t pt-2 mt-2 text-muted-foreground">
              Resolution: {esc.resolution_notes}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {esc.status === "open" && (
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => onUpdateEscalation({ id: esc.id, campaignId, status: "in_progress" })}>
                Start Working
              </Button>
            )}
            {esc.status === "in_progress" && (
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => setResolveTarget(esc)}>
                Resolve
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground/60">
            {new Date(esc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-red-400 font-medium">{open.length} Open</span>
          <span className="text-yellow-400">{inProgress.length} In Progress</span>
          <span className="text-green-400">{resolved.length} Resolved</span>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Escalation
        </Button>
      </div>

      {escalations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No escalations.</p>
          <p className="text-xs mt-1">Issues that need attention will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...open, ...inProgress, ...resolved].map(renderCard)}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Escalation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Severity</Label>
              <Select value={formSeverity} onValueChange={setFormSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue Type</Label>
              <Select value={formIssueType} onValueChange={setFormIssueType}>
                <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Site Name</Label>
              <Input value={formSite} onChange={e => setFormSite(e.target.value)} placeholder="e.g. Vernon Ford" />
            </div>
            <div>
              <Label>Charger ID (optional)</Label>
              <Input value={formChargerId} onChange={e => setFormChargerId(e.target.value)} placeholder="e.g. CHG-001" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="Describe the issue..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Escalation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PromptDialog
        open={!!resolveTarget}
        onOpenChange={(o) => { if (!o) setResolveTarget(null); }}
        title="Resolve escalation"
        description={resolveTarget ? `Mark "${resolveTarget.issue_type}" as resolved.` : ""}
        label="Resolution notes"
        placeholder="What did you do to resolve this?"
        confirmLabel="Mark resolved"
        required
        onConfirm={(notes) => {
          if (resolveTarget) {
            onUpdateEscalation({ id: resolveTarget.id, campaignId, status: "resolved", resolution_notes: notes });
            toast.success("Escalation resolved");
          }
          setResolveTarget(null);
        }}
      />
    </div>
  );
}
