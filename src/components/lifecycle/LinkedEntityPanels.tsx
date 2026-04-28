import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Inbox, FileText, Ticket as TicketIcon, ClipboardCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function PanelHeader({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h4>
      {typeof count === "number" && count > 0 && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{count}</Badge>
      )}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="text-xs text-muted-foreground py-3 px-1">{message}</div>
  );
}

function LinkRow({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border/60 bg-card text-left transition-colors",
        onClick && "hover:bg-muted/60 hover:border-border cursor-pointer",
        !onClick && "cursor-default opacity-90",
      )}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {onClick && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const variant =
    s.includes("approved") || s.includes("complete") || s === "closed"
      ? "bg-optimal/15 text-optimal border-optimal/30"
      : s.includes("reject") || s.includes("cancel") || s.includes("flag")
      ? "bg-critical/15 text-critical border-critical/30"
      : s.includes("progress") || s.includes("scheduled") || s.includes("sent")
      ? "bg-primary/15 text-primary border-primary/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", variant)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/* ─────────────────────────── Related Work Orders ─────────────────────────── */
export function RelatedWorkOrdersPanel({
  workOrders,
}: {
  workOrders: Array<{
    id: string;
    work_order_number: string | null;
    status: string;
    technician_name?: string | null;
    created_at: string;
  }>;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4">
        <PanelHeader icon={Wrench} title="Related Work Orders" count={workOrders.length} />
        {workOrders.length === 0 ? (
          <EmptyRow message="No work orders yet. Generated when an estimate is approved." />
        ) : (
          <div className="space-y-1.5">
            {workOrders.map((wo) => (
              <LinkRow key={wo.id} onClick={() => navigate(`/operations/work-orders?id=${wo.id}`)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono font-semibold">
                    {wo.work_order_number || wo.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={wo.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {wo.technician_name || "Unassigned"}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {format(new Date(wo.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </LinkRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Source Submission ─────────────────────────── */
export function SourceSubmissionPanel({
  submission,
}: {
  submission: {
    id: string;
    submission_id: string | null;
    full_name: string | null;
    email: string | null;
    status: string | null;
    created_at: string;
  } | null;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4">
        <PanelHeader icon={Inbox} title="Source Submission" />
        {!submission ? (
          <EmptyRow message="Created directly. No submission origin." />
        ) : (
          <LinkRow onClick={() => navigate(`/business/submissions?id=${submission.id}`)}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono font-semibold">
                {submission.submission_id || submission.id.slice(0, 8)}
              </span>
              <StatusBadge status={submission.status} />
              <span className="text-[11px] text-muted-foreground">
                {submission.full_name || submission.email || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {format(new Date(submission.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </LinkRow>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Related Estimate ─────────────────────────── */
export function RelatedEstimatePanel({
  estimates,
}: {
  estimates: Array<{
    id: string;
    estimate_number: string | null;
    total: number | null;
    status: string | null;
    created_at: string;
  }>;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4">
        <PanelHeader icon={FileText} title="Estimate" count={estimates.length} />
        {estimates.length === 0 ? (
          <EmptyRow message="No estimate yet." />
        ) : (
          <div className="space-y-1.5">
            {estimates.map((e) => (
              <LinkRow key={e.id} onClick={() => navigate(`/operations/estimates?id=${e.id}`)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono font-semibold">
                    #{e.estimate_number || e.id.slice(0, 8)}
                  </span>
                  <span className="text-xs font-semibold">
                    {e.total != null
                      ? `$${Number(e.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                  <StatusBadge status={e.status} />
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {format(new Date(e.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </LinkRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Parent Ticket (for WO) ─────────────────────────── */
export function ParentTicketPanel({
  ticket,
}: {
  ticket: {
    id: string;
    ticket_id: string;
    status: string;
    site_name: string | null;
    city: string | null;
    state: string | null;
  } | null;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4">
        <PanelHeader icon={TicketIcon} title="Parent Ticket" />
        {!ticket ? (
          <EmptyRow message="Standalone work order. No parent ticket." />
        ) : (
          <LinkRow onClick={() => navigate(`/operations/tickets?id=${ticket.id}`)}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono font-semibold">{ticket.ticket_id}</span>
              <StatusBadge status={ticket.status} />
              <span className="text-[11px] text-muted-foreground">
                {ticket.site_name || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {[ticket.city, ticket.state].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          </LinkRow>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Field Report (for WO) ─────────────────────────── */
export function FieldReportPanel({
  workOrderId,
  status,
  submittedBy,
  submittedAt,
}: {
  workOrderId: string;
  status?: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
}) {
  const navigate = useNavigate();
  const hasReport = !!submittedAt;
  return (
    <Card>
      <CardContent className="p-4">
        <PanelHeader icon={ClipboardCheck} title="Field Report" />
        {!hasReport ? (
          <EmptyRow message="Awaiting field execution." />
        ) : (
          <LinkRow onClick={() => navigate(`/operations/work-orders?id=${workOrderId}&tab=captured`)}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono font-semibold">
                FR-{workOrderId.slice(0, 6).toUpperCase()}
              </span>
              <StatusBadge status={status} />
              <span className="text-[11px] text-muted-foreground">
                {submittedBy || "Technician"}
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {submittedAt ? format(new Date(submittedAt), "MMM d, yyyy") : "—"}
              </span>
            </div>
          </LinkRow>
        )}
      </CardContent>
    </Card>
  );
}
