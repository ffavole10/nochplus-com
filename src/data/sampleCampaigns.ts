export type CampaignStatus = "Completed" | "In Progress" | "Scheduled";

export interface SampleCampaign {
  id: string;
  name: string;
  customer: string;
  status: CampaignStatus;
  quarter: string;
  year: number;
  startDate: string;
  endDate: string;
  totalChargers: number;
  totalServiced: number;
  healthScore: number;
  optimalCount: number;
  degradedCount: number;
  criticalCount: number;
}

export const sampleCampaigns: SampleCampaign[] = [
  {
    id: "1",
    name: "EVgo Q4 2025 California",
    customer: "evgo",
    status: "Completed",
    quarter: "Q4",
    year: 2025,
    startDate: "2025-10-01",
    endDate: "2025-12-15",
    totalChargers: 245,
    totalServiced: 245,
    healthScore: 87,
    optimalCount: 198,
    degradedCount: 35,
    criticalCount: 12,
  },
  {
    id: "2",
    name: "EVConnect | BTC Portfolio Q1 2026",
    customer: "evconnect",
    status: "In Progress",
    quarter: "Q1",
    year: 2026,
    startDate: "2026-01-05",
    endDate: "2026-03-30",
    totalChargers: 180,
    totalServiced: 95,
    healthScore: 72,
    optimalCount: 68,
    degradedCount: 20,
    criticalCount: 7,
  },
  {
    id: "3",
    name: "Electrify America Q1 2026 West Coast",
    customer: "electrify_america",
    status: "In Progress",
    quarter: "Q1",
    year: 2026,
    startDate: "2026-01-10",
    endDate: "2026-03-25",
    totalChargers: 230,
    totalServiced: 110,
    healthScore: 76,
    optimalCount: 84,
    degradedCount: 20,
    criticalCount: 6,
  },
  {
    id: "4",
    name: "ChargePoint Q2 2026 Texas",
    customer: "chargepoint",
    status: "Scheduled",
    quarter: "Q2",
    year: 2026,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    totalChargers: 275,
    totalServiced: 0,
    healthScore: 0,
    optimalCount: 0,
    degradedCount: 0,
    criticalCount: 0,
  },
];

export const CUSTOMER_LABELS: Record<string, string> = {
  evgo: "EVgo",
  evconnect: "EVConnect",
  electrify_america: "Electrify America",
  chargepoint: "ChargePoint",
  other: "Other",
};
