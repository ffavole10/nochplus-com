export type ChargerType = "DCFC" | "L2" | "HPCD";
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
  dcfcCount: number;
  l2Count: number;
  hpcdCount: number;
}

export type ViewMode = "dashboard" | "map" | "kanban";
