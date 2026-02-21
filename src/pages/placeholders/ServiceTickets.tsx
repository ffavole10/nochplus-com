import { useState, useMemo, useCallback } from "react";
import { Plus, Ticket, Search, ArrowUpDown, Crosshair, Diamond, UserPlus, Loader2, Eye, Camera, FileText, Wrench, Shield, Brain, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StandardizedTicketIntakeForm from "@/components/tickets/StandardizedTicketIntakeForm";
import { TicketDetailPanel } from "@/components/tickets/TicketDetailPanel";
import { TicketReviewPanel } from "@/components/tickets/TicketReviewPanel";
import { ParentTicketDetail } from "@/components/tickets/ParentTicketDetail";
import type { TicketData } from "@/types/ticket";
import { ServiceTicket } from "@/types/serviceTicket";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { AutoHealResult } from "@/services/autoHealService";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

const PRIORITY_STYLES: Record<string, { badge: string; border: string }> = {
  Critical: { badge: "bg-critical text-critical-foreground", border: "border-l-critical" },
  High: { badge: "bg-degraded text-degraded-foreground", border: "border-l-degraded" },
  Medium: { badge: "bg-medium text-medium-foreground", border: "border-l-medium" },
  Low: { badge: "bg-optimal text-optimal-foreground", border: "border-l-optimal" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  campaign: { label: "Campaign", icon: Crosshair, className: "bg-primary/10 text-primary border-primary/20" },
  noch_plus: { label: "Noch+", icon: Diamond, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  manual: { label: "Manual", icon: UserPlus, className: "bg-muted text-muted-foreground border-border" },
};

const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  all: "All Stages",
  pending_review: "Pending Review",
  assessment: "Assessment",
  estimate: "Estimate",
  approval: "Approval",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
};

function getStageFromStep(ticket: ServiceTicket): string {
  if (ticket.status === "completed") return "completed";
  if (ticket.status === "pending_review") return "pending_review";
  if (ticket.currentStep <= 1) return "assessment";
  if (ticket.currentStep <= 3) return "estimate";
  if (ticket.currentStep <= 5) return "approval";
  if (ticket.currentStep <= 8) return "scheduled";
  return "in_progress";
}

function getHighestPriority(tickets: ServiceTicket[]): string {
  const order = ["Critical", "High", "Medium", "Low"];
  for (const p of order) {
    if (tickets.some((t) => t.priority === p)) return p;
  }
  return "Medium";
}

export default function ServiceTickets() {
  const tickets = useServiceTicketsStore((s) => s.tickets);
  const updateTicketInStore = useServiceTicketsStore((s) => s.updateTicket);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status" | "customer">("date");

  // Local helper to get children without store selector (avoids infinite loop)
  const getChildrenOf = useCallback((parentId: string) => {
    const parent = tickets.find((t) => t.id === parentId);
    if (!parent?.childTicketIds) return [];
    return parent.childTicketIds
      .map((cid) => tickets.find((t) => t.id === cid))
      .filter(Boolean) as ServiceTicket[];
  }, [tickets]);

  // Display tickets: only parents and standalones (not children)
  const displayTickets = useMemo(() => {
    return tickets.filter((t) => !t.parentTicketId);
  }, [tickets]);

  const filtered = useMemo(() => {
    let result = [...displayTickets];

    if (sourceFilter !== "all") result = result.filter(t => t.source === sourceFilter);
    if (priorityFilter !== "all") {
      result = result.filter(t => {
        if (t.isParent) {
          const children = getChildrenOf(t.id);
          return children.some(c => c.priority === priorityFilter) || t.priority === priorityFilter;
        }
        return t.priority === priorityFilter;
      });
    }
    if (stageFilter !== "all") {
      result = result.filter(t => {
        if (t.isParent) {
          const children = getChildrenOf(t.id);
          return children.some(c => getStageFromStep(c) === stageFilter);
        }
        return getStageFromStep(t) === stageFilter;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const directMatch = t.ticketId.toLowerCase().includes(q) ||
          t.customer.name.toLowerCase().includes(q) ||
          t.customer.company.toLowerCase().includes(q) ||
          t.charger.serialNumber.toLowerCase().includes(q) ||
          t.issue.description.toLowerCase().includes(q);
        if (directMatch) return true;
        if (t.isParent) {
          const children = getChildrenOf(t.id);
          return children.some(c =>
            c.ticketId.toLowerCase().includes(q) ||
            c.charger.serialNumber.toLowerCase().includes(q) ||
            c.issue.description.toLowerCase().includes(q)
          );
        }
        return false;
      });
    }

    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    result.sort((a, b) => {
      switch (sortBy) {
        case "priority": return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
        case "status": return a.currentStep - b.currentStep;
        case "customer": return a.customer.name.localeCompare(b.customer.name);
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [displayTickets, search, sourceFilter, stageFilter, priorityFilter, sortBy, getChildrenOf]);

  // Stats - count all non-parent tickets
  const allLeafTickets = useMemo(() => tickets.filter(t => !t.isParent), [tickets]);
  const stats = useMemo(() => ({
    total: allLeafTickets.length,
    pending: allLeafTickets.filter(t => t.status === "pending_review").length,
    inProgress: allLeafTickets.filter(t => t.status === "in_progress").length,
    completed: allLeafTickets.filter(t => t.status === "completed" && differenceInDays(new Date(), new Date(t.updatedAt)) <= 30).length,
  }), [allLeafTickets]);

  const addTicket = useServiceTicketsStore((s) => s.addTicket);
  const createParentWithChildren = useServiceTicketsStore((s) => s.createParentWithChildren);

  const handleSubmit = (data: TicketData) => {
    // Single charger: create standalone ticket
    const nextId = useServiceTicketsStore.getState().getNextTicketId();
    const newTicket: ServiceTicket = {
      id: `st-${Date.now()}`,
      ticketId: nextId,
      source: "manual",
      customer: data.customer,
      charger: data.charger,
      photos: [],
      issue: data.issue,
      priority: "Medium",
      status: "pending_review",
      currentStep: 1,
      workflowSteps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ id: "h1", timestamp: new Date().toISOString(), action: "Manual ticket created", performedBy: "Current User" }],
    };
    addTicket(newTicket);
    toast.success(`Ticket ${newTicket.ticketId} created successfully`);
    setFormOpen(false);
  };

  const handleViewDetails = (ticket: ServiceTicket) => {
    setExpandedTicketId(prev => prev === ticket.id ? null : ticket.id);
  };

  const handleNavigateToChild = (childId: string) => {
    setExpandedTicketId(childId);
  };

  const handleUpdateTicket = (ticketId: string, updates: Partial<ServiceTicket>) => {
    updateTicketInStore(ticketId, updates);
  };

  const handleApproveTicket = (ticketId: string, result: AutoHealResult, notes: string) => {
    const t = useServiceTicketsStore.getState().getTicketById(ticketId);
    if (!t) return;
    const now = new Date().toISOString();
    const updatedSteps = t.workflowSteps.map(s => {
      if (s.number === 1) return { ...s, status: "complete" as const, completedAt: now };
      if (s.number === 2 && result.swiMatch?.matched_swi_id) return { ...s, status: "complete" as const, completedAt: now };
      if (s.number === 2 && !result.swiMatch?.matched_swi_id) return { ...s, status: "in_progress" as const };
      if (s.number === 3) return { ...s, status: result.swiMatch?.matched_swi_id ? "in_progress" as const : "pending" as const };
      return s;
    });
    const newStep = result.swiMatch?.matched_swi_id ? 3 : 2;
    updateTicketInStore(ticketId, {
      status: "in_progress" as const,
      currentStep: newStep,
      workflowSteps: updatedSteps,
      assessmentData: {
        riskLevel: result.assessment.riskLevel,
        assessmentText: result.assessment.assessmentText,
        recommendation: result.assessment.recommendation,
        chargerType: result.assessment.chargerType,
        warrantyNotes: result.assessment.warrantyNotes,
        dataSources: result.assessment.dataSources,
        timestamp: result.assessment.timestamp,
      },
      swiMatchData: result.swiMatch || undefined,
      swiMatchId: result.swiMatch?.matched_swi_id || undefined,
      swiConfidence: result.swiMatch?.confidence || undefined,
      btcDatabaseData: result.assessment.btcData,
      reviewNotes: notes || undefined,
      priority: result.assessment.riskLevel,
      updatedAt: now,
      history: [
        ...t.history,
        { id: `h-${Date.now()}`, timestamp: now, action: `Approved & AutoHeal assessment complete — ${result.assessment.riskLevel} risk`, performedBy: "Account Manager" },
        ...(result.swiMatch?.matched_swi_id ? [{ id: `h-${Date.now() + 1}`, timestamp: now, action: `SWI matched: ${result.swiMatch.matched_swi_id} (${result.swiMatch.confidence}%)`, performedBy: "AI Engine" }] : []),
      ],
    });
  };

  const handleRejectTicket = (ticketId: string, reason: string) => {
    const t = useServiceTicketsStore.getState().getTicketById(ticketId);
    if (!t) return;
    const now = new Date().toISOString();
    updateTicketInStore(ticketId, {
      status: "rejected" as const,
      rejectionReason: reason,
      updatedAt: now,
      history: [...t.history, { id: `h-${Date.now()}`, timestamp: now, action: `Ticket rejected: ${reason}`, performedBy: "Account Manager" }],
    });
  };

  // Check if the expanded ticket is a child ticket (to render it inline under its parent)
  const expandedTicket = expandedTicketId ? tickets.find(t => t.id === expandedTicketId) : null;
  const expandedIsChild = expandedTicket?.parentTicketId != null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold text-medium">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-secondary">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Completed (30d)</p>
            <p className="text-2xl font-bold text-optimal">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket ID, customer, serial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
          <TabsList>
            <TabsTrigger value="all">All Sources</TabsTrigger>
            <TabsTrigger value="campaign">Campaign</TabsTrigger>
            <TabsTrigger value="noch_plus">Noch+</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Workflow Stage" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(WORKFLOW_STAGE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-36">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground gap-4">
          <Ticket className="h-16 w-16 text-primary/40" />
          <p className="text-sm">No tickets match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(ticket => {
            const isParent = ticket.isParent;
            const children = isParent ? getChildrenOf(ticket.id) : [];
            const displayPriority = isParent ? getHighestPriority(children) : ticket.priority;
            const pStyle = PRIORITY_STYLES[displayPriority];
            const srcConfig = SOURCE_CONFIG[ticket.source];
            const SrcIcon = srcConfig.icon;
            const ageDays = differenceInDays(new Date(), new Date(ticket.createdAt));

            // For parent tickets, show aggregated progress
            const progressInfo = isParent ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  {children.filter(c => c.status === "completed").length}/{children.length} completed
                </span>
                <div className="flex gap-0.5 items-center">
                  {children.map((child, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        child.status === "completed" ? "bg-optimal" :
                        child.status === "in_progress" ? "bg-primary" :
                        child.status === "pending_review" ? "bg-medium" :
                        "bg-muted"
                      }`}
                      title={`${child.ticketId}: ${child.status}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  Step {ticket.currentStep} of 10: {ticket.workflowSteps.find(s => s.number === ticket.currentStep)?.label || "Assessment"}
                </span>
                <div className="flex gap-0.5 items-center">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < ticket.currentStep - 1
                          ? "bg-optimal"
                          : i === ticket.currentStep - 1
                          ? "bg-primary animate-pulse"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );

            // Determine if this parent has an expanded child
            const expandedChildOfThisParent = isParent && expandedIsChild && children.some(c => c.id === expandedTicketId);

            return (
              <Card key={ticket.id} className={`transition-all hover:shadow-md border-l-4 ${pStyle.border}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{ticket.ticketId}</span>
                        {isParent && (
                          <Badge variant="outline" className="gap-1 text-xs bg-primary/5 text-primary border-primary/20">
                            <Users className="h-3 w-3" />
                            {children.length} charger{children.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge className={pStyle.badge}>{displayPriority}</Badge>
                        <Badge variant="outline" className={`gap-1 text-xs ${srcConfig.className}`}>
                          <SrcIcon className="h-3 w-3" />
                          {srcConfig.label}
                          {ticket.sourceCampaignName && ` (${ticket.sourceCampaignName})`}
                        </Badge>
                        {!isParent && ticket.status === "pending_review" && (
                          <Badge variant="outline" className="gap-1 text-xs bg-medium/10 text-medium border-medium/20">
                            <Shield className="h-3 w-3" /> Pending Review
                          </Badge>
                        )}
                        {!isParent && ticket.status === "rejected" && (
                          <Badge variant="outline" className="gap-1 text-xs bg-critical/10 text-critical border-critical/20">
                            Rejected
                          </Badge>
                        )}
                        {!isParent && ticket.swiConfidence && (
                          <Badge variant="outline" className="gap-1 text-xs bg-optimal/5 text-optimal border-optimal/20">
                            🤖 SWI {ticket.swiConfidence}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">{ticket.customer.name}</span>
                        <span>{ticket.customer.company}</span>
                        {!isParent && <span className="font-mono text-xs">{ticket.charger.serialNumber}</span>}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.issue.description}</p>

                      {/* Progress */}
                      {progressInfo}
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {!isParent && ticket.photos.length > 0 && (
                          <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{ticket.photos.length}</span>
                        )}
                        {!isParent && ticket.estimateId && (
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Est</span>
                        )}
                        <span>{ageDays}d ago</span>
                      </div>
                      {!isParent && ticket.assignedTo && (
                        <span className="text-xs text-muted-foreground">{ticket.assignedTo}</span>
                      )}
                      {/* Action buttons */}
                      {isParent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleViewDetails(ticket)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {expandedTicketId === ticket.id ? "Collapse" : "View Chargers"}
                        </Button>
                      ) : ticket.status === "pending_review" ? (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleViewDetails(ticket)}
                        >
                          <Brain className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleViewDetails(ticket)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline Parent Detail */}
                  {isParent && expandedTicketId === ticket.id && (
                    <ParentTicketDetail
                      ticket={ticket}
                      onCollapse={() => setExpandedTicketId(null)}
                      onNavigateToChild={handleNavigateToChild}
                    />
                  )}

                  {/* Inline child detail expanded under its parent */}
                  {isParent && expandedChildOfThisParent && expandedTicket && (
                    <ChildInlinePanel
                      ticket={expandedTicket}
                      onCollapse={() => setExpandedTicketId(null)}
                      onBackToParent={() => setExpandedTicketId(ticket.id)}
                      onNavigateToSibling={handleNavigateToChild}
                      onApprove={handleApproveTicket}
                      onReject={handleRejectTicket}
                      onUpdate={handleUpdateTicket}
                    />
                  )}

                  {/* Inline Review Panel for standalone tickets */}
                  {!isParent && ticket.status === "pending_review" && expandedTicketId === ticket.id && (
                    <TicketReviewPanel
                      ticket={ticket}
                      onApprove={handleApproveTicket}
                      onReject={handleRejectTicket}
                      onUpdate={handleUpdateTicket}
                      onCollapse={() => setExpandedTicketId(null)}
                    />
                  )}
                  {/* Inline Detail Panel for standalone tickets */}
                  {!isParent && ticket.status !== "pending_review" && expandedTicketId === ticket.id && (
                    <TicketDetailPanel
                      ticket={ticket}
                      onCollapse={() => setExpandedTicketId(null)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Manual Ticket Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Ticket</DialogTitle>
          </DialogHeader>
          <StandardizedTicketIntakeForm
            mode="create"
            source="manual"
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Child Inline Panel: wraps Review or Detail with breadcrumb navigation ── */
function ChildInlinePanel({
  ticket,
  onCollapse,
  onBackToParent,
  onNavigateToSibling,
  onApprove,
  onReject,
  onUpdate,
}: {
  ticket: ServiceTicket;
  onCollapse: () => void;
  onBackToParent: () => void;
  onNavigateToSibling: (id: string) => void;
  onApprove: (ticketId: string, result: AutoHealResult, notes: string) => void;
  onReject: (ticketId: string, reason: string) => void;
  onUpdate: (ticketId: string, updates: Partial<ServiceTicket>) => void;
}) {
  const allTickets = useServiceTicketsStore((s) => s.tickets);
  const parent = useMemo(() => {
    if (!ticket.parentTicketId) return undefined;
    return allTickets.find((t) => t.id === ticket.parentTicketId);
  }, [allTickets, ticket.parentTicketId]);
  const children = useMemo(() => {
    if (!parent?.childTicketIds) return [];
    return parent.childTicketIds
      .map((cid) => allTickets.find((t) => t.id === cid))
      .filter(Boolean) as ServiceTicket[];
  }, [allTickets, parent?.childTicketIds]);
  const siblings = useMemo(() => children.filter((c) => c.id !== ticket.id), [children, ticket.id]);

  return (
    <div className="border-t border-border">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-1 text-xs flex-wrap">
        <button onClick={onBackToParent} className="text-primary hover:underline font-medium">
          ← {parent?.ticketId || "Parent"}
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-foreground">{ticket.ticketId}</span>
        {siblings.length > 0 && (
          <>
            <span className="text-muted-foreground ml-2">|</span>
            <span className="text-muted-foreground">Siblings:</span>
            {children.map((sib) => (
              <button
                key={sib.id}
                onClick={() => sib.id !== ticket.id ? onNavigateToSibling(sib.id) : undefined}
                className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  sib.id === ticket.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                /{sib.childIndex}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Actual panel */}
      {ticket.status === "pending_review" ? (
        <TicketReviewPanel
          ticket={ticket}
          onApprove={onApprove}
          onReject={onReject}
          onUpdate={onUpdate}
          onCollapse={onCollapse}
        />
      ) : (
        <TicketDetailPanel
          ticket={ticket}
          onCollapse={onCollapse}
        />
      )}
    </div>
  );
}
