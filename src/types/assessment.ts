export type ChargerType = "AC | Level 2" | "DC | Level 3";
export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";
export type Phase = "Needs Assessment" | "Scheduled" | "In Progress" | "Completed" | "Deferred";

export interface AssessmentCharger {
  id: string;
  assetName: string;
  assetRecordType: ChargerType;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  inServiceDate: string | null;
  partsWarrantyEndDate: string | null;
  serviceContractEndDate: string | null;
  accountName: string;
  evseId: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  phase: Phase;
  assignedTo: string;
  scheduledDate: string | null;
  notes: string;
  lastUpdated: string;
  latitude: number | null;
  longitude: number | null;
  // Ticket fields
  ticketId: string | null;
  ticketCreatedDate: string | null;
  ticketSolvedDate: string | null;
  ticketGroup: string | null;
  ticketSubject: string | null;
  ticketReportingSource: string | null;
  hasOpenTicket: boolean;
  // Dynamic extra fields from uploaded file
  extraFields: Record<string, string | number | boolean | null>;
}

export interface AssessmentStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  inProgress: number;
  completed: number;
  completionPercent: number;
  acL2Count: number;
  dcL3Count: number;
}

export interface AssessmentTicketStats {
  totalWithTickets: number;
  openTickets: number;
  solvedTickets: number;
}

export type ViewMode = "dataset" | "campaign-dashboard" | "map" | "kanban" | "schedule" | "tickets";

export type TicketPriority = "P1-Critical" | "P2-High" | "P3-Medium" | "P4-Low";

export interface TicketView {
  charger: AssessmentCharger;
  ticketPriority: TicketPriority;
  ageDays: number;
  recommendation: string;
}
