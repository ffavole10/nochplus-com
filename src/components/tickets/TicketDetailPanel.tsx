import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTicket, StepStatus } from "@/types/serviceTicket";
import { ServiceDispatchModal } from "@/components/tickets/ServiceDispatchModal";
import {
  CheckCircle, Circle, Loader2, XCircle, Clock, User, Building2, Mail, Phone,
  MapPin, Wrench, FileText, Send, Eye, ExternalLink,
  Image as ImageIcon, AlertTriangle, X, ChevronDown, ChevronUp, ClipboardCopy,
} from "lucide-react";
import { useState } from "react";

interface TicketDetailPanelProps {
  ticket: ServiceTicket;
  onCollapse: () => void;
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

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle className="h-5 w-5 text-optimal flex-shrink-0" />;
    case "in_progress":
      return <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-critical flex-shrink-0" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />;
  }
}

export function TicketDetailPanel({ ticket, onCollapse }: TicketDetailPanelProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const progressPercent = ((ticket.currentStep - 1) / 10) * 100;

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{ticket.ticketId}</h3>
          <Badge className={PRIORITY_STYLES[ticket.priority]}>{ticket.priority}</Badge>
          <Badge variant="outline">{SOURCE_LABELS[ticket.source]}</Badge>
          {ticket.sourceCampaignName && (
            <span className="text-xs text-muted-foreground">({ticket.sourceCampaignName})</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onCollapse}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">Step {ticket.currentStep} of 10</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workflow">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="charger">Charger</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="estimate">Estimate</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Customer */}
        <TabsContent value="customer" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={User} label="Name" value={ticket.customer.name} />
            <InfoRow icon={Building2} label="Company" value={ticket.customer.company} />
            <InfoRow icon={Mail} label="Email" value={ticket.customer.email} />
            <InfoRow icon={Phone} label="Phone" value={ticket.customer.phone} />
            <InfoRow icon={MapPin} label="Address" value={ticket.customer.address} className="sm:col-span-2" />
          </div>
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Source Metadata</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{SOURCE_LABELS[ticket.source]}</span></div>
              {ticket.sourceCampaignName && <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{ticket.sourceCampaignName}</span></div>}
              <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}</span></div>
              {ticket.assignedTo && <div><span className="text-muted-foreground">Assigned to:</span> <span className="font-medium">{ticket.assignedTo}</span></div>}
              {ticket.metadata?.issueId && <div><span className="text-muted-foreground">Issue ID:</span> <span className="font-medium font-mono">{ticket.metadata.issueId}</span></div>}
              {ticket.metadata?.approvedByName && <div><span className="text-muted-foreground">Approved by:</span> <span className="font-medium">{ticket.metadata.approvedByName}</span></div>}
              {ticket.metadata?.approvedAt && <div><span className="text-muted-foreground">Approved at:</span> <span className="font-medium">{format(new Date(ticket.metadata.approvedAt), "MMM d, yyyy h:mm a")}</span></div>}
            </div>
          </div>
        </TabsContent>

        {/* Charger */}
        <TabsContent value="charger" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Wrench} label="Brand" value={ticket.charger.brand || "—"} />
            <InfoRow icon={FileText} label="Serial Number" value={ticket.charger.serialNumber} />
            <InfoRow icon={Wrench} label="Type" value={ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2"} />
            <InfoRow icon={MapPin} label="Location" value={ticket.charger.location} />
          </div>
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2 uppercase tracking-wide">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /> Photos
            </h4>
            {ticket.photos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {ticket.photos.map((p) => (
                  <div key={p.id} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2 uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" /> Issue Description
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.issue.description}</p>
          </div>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow" className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium">Step {ticket.currentStep} of 10:</span>
            <span className="text-xs text-muted-foreground">
              {ticket.workflowSteps.find(s => s.number === ticket.currentStep)?.label}
            </span>
          </div>
          <div className="space-y-1">
            {ticket.workflowSteps.map((step) => {
              const isExpanded = expandedStep === step.number;
              return (
                <div key={step.number} className={`rounded-lg border transition-colors ${
                  step.status === "in_progress" ? "border-primary/30 bg-primary/5" :
                  step.status === "complete" ? "border-optimal/20 bg-optimal/5" :
                  "border-border bg-background"
                }`}>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-left"
                    onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                  >
                    <StepIcon status={step.status} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                        {step.number}. {step.label}
                      </span>
                      {step.completedAt && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(step.completedAt), "MMM d")}
                        </span>
                      )}
                    </div>
                    {step.status !== "pending" && (
                      isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && step.status !== "pending" && (
                    <div className="px-3 pb-2 pl-11">
                      <WorkflowStepDetail ticket={ticket} stepNumber={step.number} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Estimate */}
        <TabsContent value="estimate" className="mt-4">
          {ticket.estimateId ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Estimate {ticket.estimateId}</span>
                  <Badge className="bg-primary text-primary-foreground">${ticket.estimateAmount?.toLocaleString()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Created {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> View Full Estimate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs">No estimate created yet</p>
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <div className="space-y-2">
            {ticket.history.map((entry) => (
              <div key={entry.id} className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{entry.action}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
                    <span>•</span>
                    <span>{entry.performedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

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

function WorkflowStepDetail({ ticket, stepNumber }: { ticket: ServiceTicket; stepNumber: number }) {
  switch (stepNumber) {
    case 1:
      return (
        <div className="space-y-2">
          {ticket.assessmentData ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={PRIORITY_STYLES[ticket.assessmentData.riskLevel]}>{ticket.assessmentData.riskLevel} Risk</Badge>
                <Badge variant="outline">{ticket.assessmentData.chargerType}</Badge>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Data Sources:</p>
                <div className="space-y-0.5">
                  {ticket.assessmentData.dataSources.map((src, i) => (
                    <p key={i} className="text-xs text-optimal flex items-center gap-1">✓ {src}</p>
                  ))}
                  {ticket.reviewNotes && <p className="text-xs text-optimal flex items-center gap-1">✓ Account manager notes</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Assessment:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ticket.assessmentData.assessmentText}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Recommendation:</p>
                <p className="text-xs text-muted-foreground">{ticket.assessmentData.recommendation}</p>
              </div>
              {ticket.assessmentData.warrantyNotes.length > 0 && (
                <div className="space-y-1 p-2 bg-medium/5 border border-medium/20 rounded-md">
                  {ticket.assessmentData.warrantyNotes.map((note, i) => (
                    <p key={i} className="text-xs text-foreground">{note}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <Badge className={PRIORITY_STYLES[ticket.priority]}>{ticket.priority} Risk</Badge>
              <p className="text-xs text-muted-foreground">AutoHeal AI assessment completed.</p>
            </>
          )}
        </div>
      );
    case 2:
      return (
        <div className="space-y-2">
          {ticket.swiMatchData ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{ticket.swiMatchData.matched_swi_id || "No match"}</Badge>
                {ticket.swiMatchData.confidence > 0 && (
                  <Badge className={ticket.swiMatchData.confidence >= 90 ? "bg-optimal/10 text-optimal" : "bg-degraded/10 text-degraded"}>
                    {ticket.swiMatchData.confidence}% confidence
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{ticket.swiMatchData.reasoning}</p>
              {ticket.swiMatchData.estimated_service_time && (
                <p className="text-xs text-muted-foreground">⏱️ Est. time: {ticket.swiMatchData.estimated_service_time}</p>
              )}
              {ticket.swiMatchData.required_parts.length > 0 && (
                <p className="text-xs text-muted-foreground">🔧 Parts: {ticket.swiMatchData.required_parts.join(", ")}</p>
              )}
              {ticket.swiMatchData.warnings.length > 0 && (
                <div className="p-2 bg-critical/5 border border-critical/20 rounded-md">
                  {ticket.swiMatchData.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-critical">⚠️ {w}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                  <ExternalLink className="h-3 w-3" /> View SWI
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7">Match Different SWI</Button>
              </div>
            </>
          ) : ticket.swiMatchId ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{ticket.swiMatchId}</Badge>
                {ticket.swiConfidence && (
                  <Badge className={ticket.swiConfidence >= 90 ? "bg-optimal/10 text-optimal" : "bg-degraded/10 text-degraded"}>
                    {ticket.swiConfidence}% confidence
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                  <ExternalLink className="h-3 w-3" /> View SWI
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">SWI matching in progress...</p>
          )}
        </div>
      );
    case 3:
      return ticket.estimateId ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Estimate {ticket.estimateId} — ${ticket.estimateAmount?.toLocaleString()}</p>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <Eye className="h-3 w-3" /> View Estimate
          </Button>
        </div>
      ) : <p className="text-xs text-muted-foreground">Creating estimate...</p>;
    case 4:
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sent to {ticket.customer.email}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Send className="h-3 w-3" /> Resend
            </Button>
          </div>
        </div>
      );
    case 5:
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Awaiting customer approval</p>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-7">Approve Manually</Button>
            <Button variant="destructive" size="sm" className="text-xs h-7">Reject</Button>
          </div>
        </div>
      );
    case 6:
      return <ScheduleStep ticket={ticket} />;
    default:
      return <p className="text-xs text-muted-foreground">Details will appear when this step is active.</p>;
  }
}

function ScheduleStep({ ticket }: { ticket: ServiceTicket }) {
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (dispatched) {
    return (
      <div className="flex items-center gap-2 text-xs text-optimal font-medium">
        <CheckCircle className="h-4 w-4" />
        <span>Dispatched to Jobber</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        className="text-xs h-7 gap-1.5"
        onClick={() => setDispatchOpen(true)}
      >
        <ClipboardCopy className="h-3 w-3" />
        Dispatch to Jobber
        <ExternalLink className="h-3 w-3" />
      </Button>
      <ServiceDispatchModal
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        ticket={ticket}
        onDispatched={() => { setDispatched(true); setDispatchOpen(false); }}
      />
    </div>
  );
}
