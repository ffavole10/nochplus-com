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

export const sampleCampaigns: SampleCampaign[] = [];

export const CUSTOMER_LABELS: Record<string, string> = {
  evgo: "EVgo",
  evconnect: "EVConnect",
  electrify_america: "Electrify America",
  chargepoint: "ChargePoint",
  other: "Other",
};
