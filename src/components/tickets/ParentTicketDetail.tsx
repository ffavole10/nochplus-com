import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceTicket } from "@/types/serviceTicket";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import {
  X, User, Building2, Mail, Phone, MapPin, ChevronRight,
  CheckCircle, Loader2, Circle, Shield, Clock,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useMemo } from "react";
import { PricingTypeBadge } from "@/pages/placeholders/Customers";
import { useCustomers } from "@/hooks/useCustomers";

interface ParentTicketDetailProps {
  ticket: ServiceTicket;
  onCollapse: () => void;
  onNavigateToChild: (childId: string) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-medium text-medium-foreground",
  Low: "bg-optimal text-optimal-foreground",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "text-medium" },
  in_progress: { label: "In Progress", className: "text-primary" },
  completed: { label: "Completed", className: "text-optimal" },
  cancelled: { label: "Cancelled", className: "text-muted-foreground" },
  rejected: { label: "Rejected", className: "text-critical" },
  approved: { label: "Approved", className: "text-optimal" },
  assessed: { label: "Assessed", className: "text-primary" },
};

export function ParentTicketDetail({ ticket, onCollapse, onNavigateToChild }: ParentTicketDetailProps) {
  const allTickets = useServiceTicketsStore((s) => s.tickets);
  const { data: dbCustomers = [] } = useCustomers();
  const matchedCustomer = dbCustomers.find(c => c.company.toLowerCase() === ticket.customer.company.toLowerCase());
  const children = useMemo(() => {
    if (!ticket.childTicketIds) return [];
    return ticket.childTicketIds
      .map((cid) => allTickets.find((t) => t.id === cid))
      .filter(Boolean) as ServiceTicket[];
  }, [allTickets, ticket.childTicketIds]);

  const completedCount = children.filter((c) => c.status === "completed").length;
  const pendingCount = children.filter((c) => c.status === "pending_review").length;
  const inProgressCount = children.filter((c) => c.status === "in_progress").length;

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-5 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">{ticket.ticketId}</h3>
          <Badge variant="outline" className="text-xs">Parent Ticket</Badge>
          <Badge className={PRIORITY_STYLES[ticket.priority]}>{ticket.priority}</Badge>
          {matchedCustomer && <PricingTypeBadge pricingType={matchedCustomer.pricing_type} />}
          <span className="text-xs text-muted-foreground">
            {children.length} charger{children.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onCollapse}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-muted/50 rounded-lg p-3">
        <InfoRow icon={User} label="Name" value={ticket.customer.name} />
        <InfoRow icon={Building2} label="Company" value={ticket.customer.company} />
        <InfoRow icon={Mail} label="Email" value={ticket.customer.email} />
        <InfoRow icon={Phone} label="Phone" value={ticket.customer.phone} />
        <InfoRow icon={MapPin} label="Address" value={ticket.customer.address} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-medium/10 border border-medium/20">
          <p className="text-lg font-bold text-medium">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-lg font-bold text-primary">{inProgressCount}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-optimal/10 border border-optimal/20">
          <p className="text-lg font-bold text-optimal">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Child Tickets Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Child Tickets ({children.length})
        </h4>
        <div className="space-y-1.5">
          {children.map((child) => {
            const statusInfo = STATUS_LABELS[child.status] || { label: child.status, className: "text-muted-foreground" };
            const ageDays = differenceInDays(new Date(), new Date(child.createdAt));
            return (
              <button
                key={child.id}
                onClick={() => onNavigateToChild(child.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-left group"
              >
                {/* Status icon */}
                {child.status === "completed" ? (
                  <CheckCircle className="h-4 w-4 text-optimal flex-shrink-0" />
                ) : child.status === "in_progress" ? (
                  <Loader2 className="h-4 w-4 text-primary flex-shrink-0" />
                ) : child.status === "pending_review" ? (
                  <Shield className="h-4 w-4 text-medium flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                {/* Ticket info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-foreground">{child.ticketId}</span>
                    <Badge className={`${PRIORITY_STYLES[child.priority]} text-[10px] px-1.5 py-0`}>{child.priority}</Badge>
                    <span className={`text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{child.charger.brand} {child.charger.serialNumber}</span>
                    <span>Step {child.currentStep}/10</span>
                    {child.assignedTo && <span>{child.assignedTo}</span>}
                    <span>{ageDays}d ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{child.issue.description}</p>
                </div>

                {/* Progress dots */}
                <div className="flex gap-0.5 items-center shrink-0 hidden sm:flex">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < child.currentStep - 1
                          ? "bg-optimal"
                          : i === child.currentStep - 1
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">History</h4>
        <div className="space-y-1.5">
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
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="text-xs font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
