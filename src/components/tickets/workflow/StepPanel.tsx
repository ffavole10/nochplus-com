import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Lock, Loader2, CheckCircle2, AlertTriangle, OctagonAlert, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_STEPS,
  WorkflowStepStatus,
  WorkflowStepState,
} from "@/lib/ticketWorkflow";
import type {
  RelatedEstimate,
  RelatedWorkOrder,
} from "@/hooks/useEntityRelations";
import { format } from "date-fns";

interface StepPanelProps {
  step: WorkflowStepStatus;
  estimates: RelatedEstimate[];
  workOrders: RelatedWorkOrder[];
}

const STATE_BADGE: Record<WorkflowStepState, { label: string; className: string; Icon: any }> = {
  active: { label: "Active", className: "bg-primary/15 text-primary border-primary/30", Icon: Loader2 },
  completed: { label: "Completed", className: "bg-optimal/15 text-optimal border-optimal/30", Icon: CheckCircle2 },
  locked: { label: "Locked", className: "bg-muted text-muted-foreground border-border", Icon: Lock },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground border-border", Icon: Slash },
  blocked: { label: "Blocked", className: "bg-medium/15 text-medium border-medium/30", Icon: AlertTriangle },
  failed: { label: "Escalated", className: "bg-critical/15 text-critical border-critical/30", Icon: OctagonAlert },
};

export function StepPanel({ step, estimates, workOrders }: StepPanelProps) {
  const navigate = useNavigate();
  const meta = STATE_BADGE[step.state];
  const Icon = meta.Icon;
  const prev = WORKFLOW_STEPS[step.def.number - 2];

  // Choose related entity to surface for this step
  let relatedEntity: React.ReactNode = null;

  if (step.def.id === "estimate" || step.def.id === "estimate_approval") {
    const est = [...estimates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    if (est) {
      relatedEntity = (
        <RelatedSummary
          title={`Estimate #${est.estimate_number || est.id.slice(0, 8)}`}
          subtitle={[
            est.total != null
              ? `$${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—",
            est.status || "—",
            format(new Date(est.created_at), "MMM d, yyyy"),
          ].join(" · ")}
          actionLabel="View Estimate"
          onAction={() => navigate(`/operations/estimates?id=${est.id}`)}
        />
      );
    }
  } else if (
    step.def.id === "work_order" ||
    step.def.id === "dispatch" ||
    step.def.id === "field_execution" ||
    step.def.id === "closeout"
  ) {
    const wo = [...workOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    if (wo) {
      relatedEntity = (
        <RelatedSummary
          title={`Work Order ${wo.work_order_number || wo.id.slice(0, 8)}`}
          subtitle={[
            wo.status || "—",
            wo.technician_name || "Unassigned",
            format(new Date(wo.created_at), "MMM d, yyyy"),
          ].join(" · ")}
          actionLabel="View Work Order"
          onAction={() => navigate(`/operations/work-orders?id=${wo.id}`)}
        />
      );
    }
  }

  return (
    <div className="space-y-3">
      {/* Step header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Step {step.def.number} · {step.def.label}
          </h3>
        </div>
        <Badge variant="outline" className={cn("gap-1.5 text-xs", meta.className)}>
          <Icon className={cn("h-3 w-3", step.state === "active" && "animate-spin")} />
          {meta.label}
        </Badge>
      </div>

      {/* Reason line for non-default states */}
      {step.reason && (step.state === "skipped" || step.state === "blocked" || step.state === "failed" || step.state === "locked") && (
        <p className="text-xs text-muted-foreground">{step.reason}</p>
      )}

      {/* Related entity OR empty state */}
      {relatedEntity ? (
        relatedEntity
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-foreground">
              {step.def.shortLabel} not started
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {step.state === "completed"
                ? "Step completed without a tracked artifact."
                : `Awaiting ${prev?.shortLabel || "previous step"}`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatedSummary({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAction}>
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
