import { PriorityLevel, ChargerType, Phase } from "./assessment";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "cancelled";
export type ScheduleItemStatus = "not_started" | "in_progress" | "completed" | "cancelled" | "rescheduled";

export type SortMethod = "priority" | "type" | "location" | "age" | "warranty";

export type CampaignType = "preventive_maintenance" | "reactive_repair" | "hybrid";

export const CAMPAIGN_TYPE_CONFIG: Record<CampaignType, {
  label: string;
  icon: string;
  className: string;
  description: string;
}> = {
  preventive_maintenance: {
    label: "Preventive",
    icon: "🔧",
    className: "bg-primary/10 text-primary border-primary/20",
    description: "Scheduled maintenance visits to prevent issues. Tickets are created as issues are found.",
  },
  reactive_repair: {
    label: "Reactive",
    icon: "⚠️",
    className: "bg-critical/10 text-critical border-critical/20",
    description: "Respond to reported issues and outages. Tickets drive the workflow.",
  },
  hybrid: {
    label: "Hybrid",
    icon: "🔄",
    className: "bg-secondary/10 text-secondary border-secondary/20",
    description: "Combination of scheduled maintenance and reactive repairs.",
  },
};

export interface CampaignConfig {
  name: string;
  startDate: string;
  endDate: string | null;
  workingDays: number[]; // 0=Sun, 1=Mon ... 6=Sat
  hoursPerCharger: number;
  workingHoursPerDay: number;
  breakTime: number;
  travelBuffer: number; // hours between chargers
  numberOfTechnicians: number;
  technicians: string[];
  routeOptimization: boolean;
  maxDailyRadius: number;
  excludedDates: string[];
  // Charger selection
  includePhases: Phase[];
  includePriorities: PriorityLevel[];
  includeTypes: ChargerType[];
  sortBy: SortMethod;
}

export interface ScheduleItem {
  chargerId: string;
  assignedTo: string;
  estimatedHours: number;
  sequenceNumber: number;
  status: ScheduleItemStatus;
  actualHours: number | null;
  completedAt: string | null;
  notes: string;
}

export interface ScheduleDay {
  date: string;
  dayOfWeek: number;
  weekNumber: number;
  chargers: ScheduleItem[];
}

export interface CampaignStatistics {
  totalChargers: number;
  completedChargers: number;
  inProgressChargers: number;
  scheduledChargers: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  currentWeek: number;
  totalWeeks: number;
  daysAheadBehind: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  configuration: CampaignConfig;
  schedule: ScheduleDay[];
  statistics: CampaignStatistics;
}

export const DEFAULT_CONFIG: CampaignConfig = {
  name: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: null,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  hoursPerCharger: 2,
  workingHoursPerDay: 8,
  breakTime: 1,
  travelBuffer: 0.25,
  numberOfTechnicians: 1,
  technicians: [],
  routeOptimization: false,
  maxDailyRadius: 50,
  excludedDates: [],
  includePhases: ["Needs Assessment"],
  includePriorities: ["Critical", "High", "Medium", "Low"],
  includeTypes: ["DCFC", "L2", "HPCD"],
  sortBy: "priority",
};
