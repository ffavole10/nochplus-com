import { TicketSource, TicketCustomerInfo, TicketChargerInfo, TicketPhoto, TicketIssueInfo } from "./ticket";

export type WorkflowStep =
  | "assessment"
  | "swi_matched"
  | "estimate_created"
  | "estimate_sent"
  | "estimate_approval"
  | "schedule_service"
  | "parts_request"
  | "service_scheduled"
  | "onsite_visit"
  | "ticket_close";

export type StepStatus = "complete" | "in_progress" | "pending" | "failed";

export interface WorkflowStepInfo {
  step: WorkflowStep;
  label: string;
  number: number;
  status: StepStatus;
  completedAt?: string;
  details?: string;
}

export type ServiceTicketPriority = "Critical" | "High" | "Medium" | "Low";
export type ServiceTicketStatus = "pending_review" | "in_progress" | "completed" | "cancelled";

export interface ServiceTicketHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details?: string;
}

export interface ServiceTicket {
  id: string;
  ticketId: string; // T-12345
  source: TicketSource;
  sourceCampaignName?: string;
  customer: TicketCustomerInfo;
  charger: TicketChargerInfo;
  photos: TicketPhoto[];
  issue: TicketIssueInfo;
  priority: ServiceTicketPriority;
  status: ServiceTicketStatus;
  currentStep: number; // 1-10
  workflowSteps: WorkflowStepInfo[];
  estimateId?: string;
  estimateAmount?: number;
  swiMatchId?: string;
  swiConfidence?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  history: ServiceTicketHistoryEntry[];
}

export const WORKFLOW_STEPS_TEMPLATE: Omit<WorkflowStepInfo, "status">[] = [
  { step: "assessment", label: "Assessment Complete", number: 1 },
  { step: "swi_matched", label: "SWI Matched", number: 2 },
  { step: "estimate_created", label: "Estimate Created", number: 3 },
  { step: "estimate_sent", label: "Sent to Customer", number: 4 },
  { step: "estimate_approval", label: "Estimate Approval", number: 5 },
  { step: "schedule_service", label: "Schedule Service", number: 6 },
  { step: "parts_request", label: "Parts Request", number: 7 },
  { step: "service_scheduled", label: "Service Scheduled", number: 8 },
  { step: "onsite_visit", label: "On-Site Visit", number: 9 },
  { step: "ticket_close", label: "Ticket Close", number: 10 },
];
