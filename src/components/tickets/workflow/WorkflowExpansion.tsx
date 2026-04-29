import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ServiceTicket } from "@/types/serviceTicket";
import { AutoHealResult } from "@/services/autoHealService";
import { useTicketRelations } from "@/hooks/useEntityRelations";
import { LifecycleChain } from "@/components/lifecycle/LifecycleChain";
import { buildTicketLifecycleChain } from "@/components/lifecycle/buildChain";
import {
  RelatedWorkOrdersPanel,
  SourceSubmissionPanel,
  RelatedEstimatePanel,
} from "@/components/lifecycle/LinkedEntityPanels";
import { TicketReviewPanel } from "@/components/tickets/TicketReviewPanel";
import { TicketDetailPanel } from "@/components/tickets/TicketDetailPanel";
import { StepStepper } from "./StepStepper";
import { StepPanel } from "./StepPanel";
import { ClosoutInvoicePanel } from "./ClosoutInvoicePanel";
import {
  WORKFLOW_STEPS,
  inferWorkflowSnapshot,
  WorkflowStepStatus,
} from "@/lib/ticketWorkflow";
import { PinButton } from "@/components/command-palette/PinButton";

interface WorkflowExpansionProps {
  ticket: ServiceTicket;
  onCollapse: () => void;
  onApprove: (ticketId: string, result: AutoHealResult, notes: string) => void;
  onReject: (ticketId: string, reason: string) => void;
  onUpdate: (ticketId: string, updates: Partial<ServiceTicket>) => void;
  defaultTab?: string;
}

export function WorkflowExpansion({
  ticket,
  onCollapse,
  onApprove,
  onReject,
  onUpdate,
  defaultTab,
}: WorkflowExpansionProps) {
  const relations = useTicketRelations({
    ticketDbId: ticket.id,
    ticketTextId: ticket.ticketId,
    siteName: ticket.customer?.company || null,
  });

  const snapshot = useMemo(
    () =>
      inferWorkflowSnapshot({
        ticket,
        estimates: relations.estimates,
        workOrders: relations.workOrders,
        submission: relations.submission,
      }),
    [ticket, relations.estimates, relations.workOrders, relations.submission],
  );

  // Default view = current active step's panel.
  // Sync once after relations load so the initial currentStep is meaningful (not the
  // pre-fetch default of 1).
  const [viewedStep, setViewedStep] = useState<number>(snapshot.currentStep);
  const userInteractedRef = useRef(false);
  useEffect(() => {
    if (!userInteractedRef.current) {
      setViewedStep(snapshot.currentStep);
    }
  }, [snapshot.currentStep]);

  const handleSelectStep = (n: number) => {
    userInteractedRef.current = true;
    setViewedStep(n);
  };

  const viewed: WorkflowStepStatus =
    snapshot.steps.find((s) => s.def.number === viewedStep) || snapshot.steps[0];

  // Arrows step by 1 across the full 1..10 range (all steps are viewable).
  const goPrev = () => {
    if (viewedStep > 1) handleSelectStep(viewedStep - 1);
  };
  const goNext = () => {
    if (viewedStep < 10) handleSelectStep(viewedStep + 1);
  };

  const lifecycleStages = buildTicketLifecycleChain({
    ticket,
    submission: relations.submission,
    estimates: relations.estimates,
    workOrders: relations.workOrders,
  });

  const isStep1 = viewed.def.id === "assessment";
  const showLifecycleAndPanels =
    !isStep1 &&
    (viewed.state === "active" ||
      viewed.state === "completed" ||
      viewed.state === "blocked" ||
      viewed.state === "failed");

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{ticket.ticketId}</h3>
        <div className="flex items-center gap-1">
          <PinButton
            type="ticket"
            id={ticket.id}
            label={`${ticket.ticketId}${ticket.customer?.company ? ` · ${ticket.customer.company}` : ""}`}
            variant="icon"
          />
          <Button size="sm" variant="ghost" onClick={onCollapse}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <StepStepper
        steps={snapshot.steps}
        viewedStep={viewedStep}
        onSelectStep={handleSelectStep}
      />

      {/* Step breadcrumb / nav */}
      <div className="flex items-center justify-between gap-3 border-y border-border/60 py-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Step {viewed.def.number} of 10
          </span>
          <span className="mx-1.5">·</span>
          <span>{viewed.def.label}</span>
          {viewedStep !== snapshot.currentStep && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              (viewing — current: Step {snapshot.currentStep})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={goPrev}
            disabled={viewedStep <= 1}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={goNext}
            disabled={viewedStep >= 10}
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Per-step content */}
      {isStep1 ? (
        ticket.status === "pending_review" ? (
          <TicketReviewPanel
            ticket={ticket}
            onApprove={onApprove}
            onReject={onReject}
            onUpdate={onUpdate}
            onCollapse={onCollapse}
          />
        ) : (
          <TicketDetailPanel
            key={`${ticket.id}-${defaultTab || "charger"}`}
            ticket={ticket}
            onCollapse={onCollapse}
            defaultTab={defaultTab || "charger"}
          />
        )
      ) : (
        <div className="space-y-4">
          {/* Lifecycle chain (above step content) */}
          {showLifecycleAndPanels && (
            <ErrorBoundary>
              <div className="overflow-x-auto">
                <LifecycleChain stages={lifecycleStages} title="Ticket lifecycle" />
              </div>
            </ErrorBoundary>
          )}

          {/* Step content: closeout uses the dual-path invoice panel */}
          {viewed.def.id === "closeout" ? (
            <ClosoutInvoicePanel
              ticket={ticket}
              step={viewed}
              workOrders={relations.workOrders}
            />
          ) : (
            <StepPanel
              step={viewed}
              estimates={relations.estimates}
              workOrders={relations.workOrders}
            />
          )}

          {/* Linked panels (below step content) */}
          {showLifecycleAndPanels && (
            <ErrorBoundary>
              <div className="grid gap-3 md:grid-cols-3">
                <RelatedWorkOrdersPanel workOrders={relations.workOrders} />
                <SourceSubmissionPanel submission={relations.submission} />
                <RelatedEstimatePanel estimates={relations.estimates} />
              </div>
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
