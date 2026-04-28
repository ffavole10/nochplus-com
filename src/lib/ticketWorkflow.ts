import { ServiceTicket } from "@/types/serviceTicket";
import type { RelatedEstimate, RelatedWorkOrder, RelatedSubmission } from "@/hooks/useEntityRelations";

export type WorkflowStepId =
  | "assessment"
  | "remote_resolution"
  | "scoping"
  | "estimate"
  | "estimate_approval"
  | "work_order"
  | "parts_planning"
  | "dispatch"
  | "field_execution"
  | "closeout";

export type WorkflowStepState =
  | "locked"
  | "active"
  | "completed"
  | "skipped"
  | "blocked"
  | "failed";

export interface WorkflowStepDef {
  id: WorkflowStepId;
  number: number; // 1..10
  label: string;
  shortLabel: string;
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  { id: "assessment", number: 1, label: "AI Triage / Assessment", shortLabel: "Assessment" },
  { id: "remote_resolution", number: 2, label: "Remote Resolution Attempt", shortLabel: "Remote Resolution" },
  { id: "scoping", number: 3, label: "Scope of Work", shortLabel: "Scoping" },
  { id: "estimate", number: 4, label: "Estimate Generated", shortLabel: "Estimate" },
  { id: "estimate_approval", number: 5, label: "Customer Estimate Approval", shortLabel: "Estimate Approval" },
  { id: "work_order", number: 6, label: "Work Order Created", shortLabel: "Work Order" },
  { id: "parts_planning", number: 7, label: "Parts Planning", shortLabel: "Parts Planning" },
  { id: "dispatch", number: 8, label: "Dispatch Assignment", shortLabel: "Dispatch" },
  { id: "field_execution", number: 9, label: "Field Execution", shortLabel: "Field Execution" },
  { id: "closeout", number: 10, label: "Field Report & Closeout", shortLabel: "Closeout" },
];

export interface WorkflowStepStatus {
  def: WorkflowStepDef;
  state: WorkflowStepState;
  /** Optional reason shown in tooltips for skipped/blocked/failed/locked. */
  reason?: string;
}

export interface WorkflowSnapshot {
  steps: WorkflowStepStatus[];
  /** Number (1..10) of the step that is currently the canonical "active" step. */
  currentStep: number;
}

export interface WorkflowInferenceInput {
  ticket: ServiceTicket;
  estimates?: RelatedEstimate[];
  workOrders?: RelatedWorkOrder[];
  submission?: RelatedSubmission | null;
}

/**
 * Best-effort inference of the workflow state from a ticket + related entities.
 * No new schema. We only read.
 *
 * Rules (per spec):
 *  - Step 1 active if assessment status is "pending_review"
 *  - Step 1 completed AND Step 2 active if assessment is "assessed" and no remote resolution attempt logged
 *  - Step 4 active if an estimate exists with status "Draft"
 *  - Step 5 active if an estimate exists with status "Sent"
 *  - Step 6 active if a work order exists for this ticket
 *  - Step 9 active if work order status is "in_progress"
 *  - Step 10 active if work order status is "completed" but no field report submitted
 *  - Default: Step 1
 *  - Closed ticket → all completed
 */
export function inferWorkflowSnapshot(input: WorkflowInferenceInput): WorkflowSnapshot {
  const { ticket, estimates = [], workOrders = [] } = input;

  // 1. Detect rejected → step 1 failed
  if (ticket.status === "rejected") {
    const steps = WORKFLOW_STEPS.map<WorkflowStepStatus>((d) => {
      if (d.number === 1) return { def: d, state: "failed", reason: ticket.rejectionReason || "Ticket rejected" };
      return { def: d, state: "locked", reason: "Awaiting Assessment" };
    });
    return { steps, currentStep: 1 };
  }

  // 2. Closed/completed → all completed
  if (ticket.status === "completed") {
    return {
      steps: WORKFLOW_STEPS.map<WorkflowStepStatus>((d) => ({ def: d, state: "completed" })),
      currentStep: 10,
    };
  }

  // 3. Determine current step number via inference
  let current = 1;

  const assessmentDone = ticket.status !== "pending_review" && !!ticket.assessmentData;

  // Estimates: pick the most recent
  const sortedEstimates = [...estimates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestEstimate = sortedEstimates[0];
  const estimateStatus = (latestEstimate?.status || "").toLowerCase();
  const estimateApproved =
    estimateStatus.includes("approved") || estimateStatus.includes("accept");
  const estimateSent = estimateStatus.includes("sent");
  const estimateDraft =
    !!latestEstimate && !estimateSent && !estimateApproved;

  // Work orders: pick the most recent matching
  const sortedWorkOrders = [...workOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestWO = sortedWorkOrders[0];
  const woStatus = (latestWO?.status || "").toLowerCase();
  const woInProgress = woStatus === "in_progress" || woStatus.includes("progress");
  const woCompleted = woStatus === "completed" || woStatus === "complete" || woStatus === "closed";

  if (woCompleted) current = 10;
  else if (woInProgress) current = 9;
  else if (latestWO) current = 6; // exists but not started/completed
  else if (estimateApproved) current = 6;
  else if (estimateSent) current = 5;
  else if (estimateDraft) current = 4;
  else if (assessmentDone) current = 2;
  else current = 1;

  // 4. Build per-step states
  const steps: WorkflowStepStatus[] = WORKFLOW_STEPS.map((d) => {
    if (d.number < current) {
      return { def: d, state: "completed" };
    }
    if (d.number === current) {
      return { def: d, state: "active" };
    }
    // future
    const prevLabel = WORKFLOW_STEPS[d.number - 2]?.shortLabel || "previous step";
    return { def: d, state: "locked", reason: `Awaiting ${prevLabel}` };
  });

  return { steps, currentStep: current };
}

/**
 * Compute the row-action button label per spec.
 */
export function buttonLabelForTicket(snapshot: WorkflowSnapshot, ticket: ServiceTicket): string {
  if (ticket.status === "completed") return "Open";
  const cur = snapshot.steps.find((s) => s.def.number === snapshot.currentStep);
  if (!cur) return "View";
  switch (cur.def.id) {
    case "assessment":
      return ticket.status === "pending_review" ? "Review" : "View";
    case "remote_resolution":
    case "scoping":
      return "View";
    default:
      return "Track";
  }
}
