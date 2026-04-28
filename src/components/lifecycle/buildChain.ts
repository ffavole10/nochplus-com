import {
  LifecycleStage,
  LifecycleStageState,
  LIFECYCLE_STAGE_LABELS,
} from "@/components/lifecycle/LifecycleChain";
import type { ServiceTicket } from "@/types/serviceTicket";
import type { WorkOrder } from "@/types/fieldCapture";
import type {
  RelatedEstimate,
  RelatedSubmission,
  RelatedWorkOrder,
} from "@/hooks/useEntityRelations";

interface BuildTicketChainArgs {
  ticket: ServiceTicket;
  submission: RelatedSubmission | null;
  estimates: RelatedEstimate[];
  workOrders: RelatedWorkOrder[];
}

const stage = (
  key: keyof typeof LIFECYCLE_STAGE_LABELS,
  state: LifecycleStageState,
  rest: Partial<LifecycleStage> = {},
): LifecycleStage => ({
  key,
  label: LIFECYCLE_STAGE_LABELS[key],
  state,
  ...rest,
});

/**
 * Builds the 7-stage lifecycle chain from a Ticket POV.
 */
export function buildTicketLifecycleChain({
  ticket,
  submission,
  estimates,
  workOrders,
}: BuildTicketChainArgs): LifecycleStage[] {
  const hasSubmission = !!submission;
  const aiTriaged =
    ticket.assessmentData != null ||
    ticket.swiMatchData != null ||
    ticket.assessmentData !== undefined && ticket.currentStep >= 1;
  const ticketStarted = true; // we have a ticket
  const approvedEstimate = estimates.find((e) => e.status === "approved");
  const anyEstimate = estimates[0] || null;
  const hasWorkOrder = workOrders.length > 0;
  const wo = workOrders[0];
  const fieldReportDone =
    !!wo && ["submitted", "approved", "closed"].includes(wo.status);
  const assessmentClosed = ticket.currentStep >= 10 || ticket.status === "completed";

  return [
    stage("submission", hasSubmission ? "complete" : "skipped", {
      entityId: submission?.submission_id || undefined,
      status: submission?.status || undefined,
      timestamp: submission?.created_at,
      href: submission ? `/business/submissions?id=${submission.id}` : undefined,
    }),
    stage("ai_triage", aiTriaged ? "complete" : ticket.currentStep === 0 ? "current" : "complete", {
      status: ticket.assessmentData ? "Completed" : "Pending",
      timestamp: ticket.assessmentData?.timestamp,
    }),
    stage("ticket", assessmentClosed ? "complete" : "current", {
      entityId: ticket.ticketId,
      status: ticket.status,
      timestamp: ticket.createdAt,
    }),
    stage(
      "estimate",
      approvedEstimate
        ? "complete"
        : anyEstimate
        ? "current"
        : ticket.currentStep >= 3
        ? "current"
        : "future",
      {
        entityId: anyEstimate ? `#${anyEstimate.estimate_number}` : undefined,
        status: anyEstimate?.status || undefined,
        timestamp: anyEstimate?.created_at,
        href: anyEstimate ? `/operations/estimates?id=${anyEstimate.id}` : undefined,
      },
    ),
    stage(
      "work_order",
      hasWorkOrder
        ? fieldReportDone
          ? "complete"
          : "current"
        : approvedEstimate
        ? "current"
        : "future",
      {
        entityId: wo?.work_order_number || undefined,
        status: wo?.status,
        timestamp: wo?.created_at,
        href: wo ? `/operations/work-orders?id=${wo.id}` : undefined,
      },
    ),
    stage(
      "field_report",
      fieldReportDone ? "complete" : hasWorkOrder ? "current" : "future",
      {
        status: wo?.status,
        timestamp: wo?.created_at,
        href: wo ? `/operations/work-orders?id=${wo.id}&tab=captured` : undefined,
      },
    ),
    stage("assessment", assessmentClosed ? "complete" : "future", {
      status: ticket.status === "completed" ? "Closed" : "Open",
    }),
  ];
}

interface BuildWorkOrderChainArgs {
  workOrder: WorkOrder;
  parentTicket: {
    id: string;
    ticket_id: string;
    status: string;
  } | null;
}

/**
 * Builds the 7-stage lifecycle chain from a Work Order POV.
 */
export function buildWorkOrderLifecycleChain({
  workOrder,
  parentTicket,
}: BuildWorkOrderChainArgs): LifecycleStage[] {
  const fieldReportDone = ["submitted", "approved", "closed"].includes(workOrder.status);
  const closed = workOrder.status === "closed" || workOrder.status === "approved";

  return [
    stage("submission", parentTicket ? "complete" : "skipped", {
      status: parentTicket ? "linked via ticket" : undefined,
    }),
    stage("ai_triage", parentTicket ? "complete" : "skipped"),
    stage("ticket", parentTicket ? "complete" : "skipped", {
      entityId: parentTicket?.ticket_id,
      status: parentTicket?.status,
      href: parentTicket ? `/operations/tickets?id=${parentTicket.id}` : undefined,
    }),
    stage("estimate", parentTicket ? "complete" : "skipped"),
    stage("work_order", closed ? "complete" : "current", {
      entityId: workOrder.work_order_number || undefined,
      status: workOrder.status,
      timestamp: workOrder.created_at,
    }),
    stage(
      "field_report",
      fieldReportDone ? "complete" : workOrder.status === "in_progress" ? "current" : "future",
      {
        status: workOrder.status,
        timestamp: workOrder.departure_timestamp || undefined,
      },
    ),
    stage("assessment", closed ? "complete" : "future", {
      status: closed ? "Closed" : "Open",
    }),
  ];
}
