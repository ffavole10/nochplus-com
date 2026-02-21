import { useState, useMemo } from "react";
import { Plus, Ticket, Search, ArrowUpDown, Crosshair, Diamond, UserPlus, Loader2, Eye, Camera, FileText, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StandardizedTicketIntakeForm from "@/components/tickets/StandardizedTicketIntakeForm";
import { ServiceTicketDetailModal } from "@/components/tickets/ServiceTicketDetailModal";
import type { TicketData } from "@/types/ticket";
import { ServiceTicket } from "@/types/serviceTicket";
import { MOCK_SERVICE_TICKETS } from "@/data/mockServiceTickets";
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

export default function ServiceTickets() {
  const [tickets, setTickets] = useState<ServiceTicket[]>(MOCK_SERVICE_TICKETS);
  const [formOpen, setFormOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<ServiceTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status" | "customer">("date");

  const filtered = useMemo(() => {
    let result = [...tickets];

    if (sourceFilter !== "all") result = result.filter(t => t.source === sourceFilter);
    if (priorityFilter !== "all") result = result.filter(t => t.priority === priorityFilter);
    if (stageFilter !== "all") result = result.filter(t => getStageFromStep(t) === stageFilter);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.ticketId.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q) ||
        t.customer.company.toLowerCase().includes(q) ||
        t.charger.serialNumber.toLowerCase().includes(q) ||
        t.issue.description.toLowerCase().includes(q)
      );
    }

    // Sort
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
  }, [tickets, search, sourceFilter, stageFilter, priorityFilter, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter(t => t.status === "pending_review").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    completed: tickets.filter(t => t.status === "completed" && differenceInDays(new Date(), new Date(t.updatedAt)) <= 30).length,
  }), [tickets]);

  const handleSubmit = (data: TicketData) => {
    const newTicket: ServiceTicket = {
      id: `st-${Date.now()}`,
      ticketId: `T-${10000 + tickets.length + 1}`,
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
    setTickets(prev => [newTicket, ...prev]);
    toast.success(`Ticket ${newTicket.ticketId} created successfully`);
    setFormOpen(false);
  };

  const handleViewDetails = (ticket: ServiceTicket) => {
    setDetailTicket(ticket);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Service Tickets</h1>
          <p className="text-sm text-muted-foreground">Unified ticket view across all sources</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Manual Ticket
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
            const pStyle = PRIORITY_STYLES[ticket.priority];
            const srcConfig = SOURCE_CONFIG[ticket.source];
            const SrcIcon = srcConfig.icon;
            const progressPercent = ((ticket.currentStep - 1) / 10) * 100;
            const currentStepLabel = ticket.workflowSteps.find(s => s.number === ticket.currentStep)?.label || "Assessment";
            const ageDays = differenceInDays(new Date(), new Date(ticket.createdAt));

            return (
              <Card key={ticket.id} className={`transition-all hover:shadow-md border-l-4 ${pStyle.border}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{ticket.ticketId}</span>
                        <Badge className={pStyle.badge}>{ticket.priority}</Badge>
                        <Badge variant="outline" className={`gap-1 text-xs ${srcConfig.className}`}>
                          <SrcIcon className="h-3 w-3" />
                          {srcConfig.label}
                          {ticket.sourceCampaignName && ` (${ticket.sourceCampaignName})`}
                        </Badge>
                        {ticket.swiConfidence && (
                          <Badge variant="outline" className="gap-1 text-xs bg-optimal/5 text-optimal border-optimal/20">
                            🤖 SWI {ticket.swiConfidence}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">{ticket.customer.name}</span>
                        <span>{ticket.customer.company}</span>
                        <span className="font-mono text-xs">{ticket.charger.serialNumber}</span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.issue.description}</p>

                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">
                          Step {ticket.currentStep} of 10: {currentStepLabel}
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
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {ticket.photos.length > 0 && (
                          <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{ticket.photos.length}</span>
                        )}
                        {ticket.estimateId && (
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Est</span>
                        )}
                        <span>{ageDays}d ago</span>
                      </div>
                      {ticket.assignedTo && (
                        <span className="text-xs text-muted-foreground">{ticket.assignedTo}</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleViewDetails(ticket)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </div>
                  </div>
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

      {/* Ticket Detail Modal */}
      <ServiceTicketDetailModal
        ticket={detailTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
