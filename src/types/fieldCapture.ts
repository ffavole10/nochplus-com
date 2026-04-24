// Field Capture domain types

export type WorkOrderStatus =
  | "scheduled"
  | "in_progress"
  | "submitted"
  | "pending_review"
  | "flagged"
  | "approved"
  | "closed";

export type ChargerCaptureStatus = "not_started" | "in_progress" | "complete";

export type ChargerIssueCategory =
  | "power_issue"
  | "screen_display"
  | "connector"
  | "payment_processing"
  | "network_connectivity"
  | "physical_damage"
  | "other";

export type ChargerRootCause =
  | "hardware_fault"
  | "firmware"
  | "network"
  | "power_supply"
  | "physical_damage"
  | "wear"
  | "unknown";

export type ChargerPostWorkStatus =
  | "operational"
  | "partially_functional"
  | "non_operational_followup"
  | "requires_parts_ordered";

export type FieldPhotoType =
  | "before"
  | "during"
  | "after"
  | "old_serial"
  | "new_serial"
  | "return_receipt"
  | "loto_verification";

export type BriefingType = "full_briefing" | "condensed_briefing";

export interface WorkOrder {
  id: string;
  work_order_number: string | null;
  client_name: string;
  site_name: string;
  site_address: string;
  assigned_technician_id: string;
  scheduled_date: string;
  status: WorkOrderStatus;
  arrival_timestamp: string | null;
  departure_timestamp: string | null;
  gps_location: string | null;
  support_time_minutes: number | null;
  access_time_minutes: number | null;
  job_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface WorkOrderCharger {
  id: string;
  work_order_id: string;
  charger_position: number;
  make_model: string | null;
  serial_number: string | null;
  status: ChargerCaptureStatus;
  added_on_site: boolean;
  issue_category: ChargerIssueCategory | null;
  issue_description: string | null;
  root_cause: ChargerRootCause | null;
  is_recurring_issue: boolean;
  work_performed: string | null;
  parts_swap_performed: boolean;
  old_serial_number: string | null;
  new_serial_number: string | null;
  resolution: string | null;
  charger_status_post_work: ChargerPostWorkStatus | null;
  capture_started_at: string | null;
  capture_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ISSUE_CATEGORY_LABELS: Record<ChargerIssueCategory, string> = {
  power_issue: "Power Issue",
  screen_display: "Screen / Display",
  connector: "Connector",
  payment_processing: "Payment Processing",
  network_connectivity: "Network / Connectivity",
  physical_damage: "Physical Damage",
  other: "Other",
};

export const ROOT_CAUSE_LABELS: Record<ChargerRootCause, string> = {
  hardware_fault: "Hardware Fault",
  firmware: "Firmware",
  network: "Network",
  power_supply: "Power Supply",
  physical_damage: "Physical Damage",
  wear: "Wear",
  unknown: "Unknown",
};

export const POST_WORK_STATUS_LABELS: Record<ChargerPostWorkStatus, string> = {
  operational: "Operational",
  partially_functional: "Partially Functional",
  non_operational_followup: "Non-Operational — Follow-Up Required",
  requires_parts_ordered: "Requires Parts (Ordered)",
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  submitted: "Submitted",
  pending_review: "Pending Review",
  flagged: "Flagged",
  approved: "Approved",
  closed: "Closed",
};
