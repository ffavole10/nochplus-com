export const GROWTH_TIERS = ["A", "B", "C"] as const;
export type GrowthTier = typeof GROWTH_TIERS[number];

export const GROWTH_MOTIONS = ["Volume", "Strategic", "Government", "OEM", "New_Logo", "Maintain"] as const;
export type GrowthMotion = typeof GROWTH_MOTIONS[number];

export const MOTION_LABELS: Record<GrowthMotion, string> = {
  Volume: "Volume Machine",
  Strategic: "Strategic Software",
  Government: "Government",
  OEM: "OEM",
  New_Logo: "New Logo",
  Maintain: "Maintain",
};

export const NETWORK_TYPES = ["CPO", "CMS", "OEM", "Government", "Fleet", "Utility", "Other"] as const;
export type NetworkType = typeof NETWORK_TYPES[number];

export const NOCHPLUS_TIMINGS = ["Live", "0-3 months", "3-6 months", "6-12 months", "12+ months", "Never"] as const;
export type NochplusTiming = typeof NOCHPLUS_TIMINGS[number];

export const SERVICE_OPTIONS = [
  "Service", "Commissioning", "Campaigns", "Warranty", "Upgrades", "Surveys", "Decommissioning",
] as const;

export const STAKEHOLDER_ROLES = [
  "Decision Maker", "Influencer", "Champion", "Blocker", "Operational", "Unknown",
] as const;
export type StakeholderRole = typeof STAKEHOLDER_ROLES[number];

export const RELATIONSHIP_STATUSES = ["Cold", "Warm", "Hot", "Champion"] as const;
export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number];

// NOCH+ 6-stage pipeline
export const DEAL_STAGES = [
  "Account Mapped",
  "Engaged",
  "Qualified",
  "Proposal Out",
  "In Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;
export type DealStage = typeof DEAL_STAGES[number];

// The visible kanban columns merge Closed Won / Lost into a single column.
export const KANBAN_STAGES = [
  "Account Mapped",
  "Engaged",
  "Qualified",
  "Proposal Out",
  "In Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  "Account Mapped": "bg-slate-500/10 text-slate-700 border-slate-300",
  "Engaged": "bg-blue-500/10 text-blue-700 border-blue-300",
  "Qualified": "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  "Proposal Out": "bg-amber-500/10 text-amber-700 border-amber-300",
  "In Negotiation": "bg-purple-500/10 text-purple-700 border-purple-300",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  "Closed Lost": "bg-rose-500/10 text-rose-700 border-rose-300",
};

export const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "LinkedIn", "InPerson", "Other"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const DEAL_HEALTH_VALUES = ["healthy", "at_risk", "critical", "stalled"] as const;
export type DealHealth = typeof DEAL_HEALTH_VALUES[number];

export const LOSS_REASONS = ["price", "timing", "competitor", "no_decision", "bad_fit", "other"] as const;
export type LossReason = typeof LOSS_REASONS[number];

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  price: "Price",
  timing: "Timing",
  competitor: "Competitor",
  no_decision: "No decision",
  bad_fit: "Bad fit",
  other: "Other",
};

export interface PartnerMeta {
  id: string;
  partner_id: string;
  tier: GrowthTier | null;
  motion: GrowthMotion | null;
  network_type: NetworkType | null;
  charger_footprint_estimate: number | null;
  charger_footprint_notes: string | null;
  hardware_brands: string[];
  regions: string[];
  annual_run_rate: number | null;
  share_of_wallet_pct: number | null;
  services_provided: string[];
  services_not_provided: string[];
  expansion_thesis: string | null;
  white_space_notes: string | null;
  nochplus_fit_score: number | null;
  nochplus_timing: NochplusTiming | null;
  strategic_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stakeholder {
  id: string;
  partner_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  role: StakeholderRole;
  relationship_status: RelationshipStatus;
  owner_user_id: string | null;
  notes: string | null;
  last_touch_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  partner_id: string;        // FK to customers — kept name for backward compat
  deal_name: string;
  description: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  next_action: string | null;
  next_action_date: string | null;
  expected_close_date: string | null;
  owner_user_id: string | null;

  // New NOCH+ pipeline fields
  predicted_close_date: string | null;
  actual_close_date: string | null;
  predicted_arr: number | null;
  actual_arr: number | null;
  owner: string | null;
  last_activity_at: string | null;
  fit_score: number | null;
  model_close_probability: number | null;
  deal_health: DealHealth | null;
  loss_reason: LossReason | null;
  competitor: string | null;
  notes: string | null;

  // Deal type & financial breakdown
  deal_type: DealType;
  recurring_model: RecurringModel | null;
  connector_count: number | null;
  monthly_rate: number | null;
  contract_length_months: number;
  one_time_value: number | null;
  one_time_description: string | null;
  rate_per_connector: number | null;

  created_at: string;
  updated_at: string;
}

export type DealType = "recurring" | "one_time" | "hybrid";
export type RecurringModel = "per_connector" | "flat_monthly";

export const PER_CONNECTOR_RATE = 15; // $15/connector/month

export interface DealEconomics {
  monthlyRate: number;
  mrr: number;
  arr: number;
  tcv: number;
  oneTime: number;
  year1Revenue: number;
}

export function computeDealEconomics(input: {
  deal_type: DealType;
  recurring_model?: RecurringModel | null;
  connector_count?: number | null;
  monthly_rate?: number | null;
  contract_length_months?: number | null;
  one_time_value?: number | null;
  rate_per_connector?: number | null;
}): DealEconomics {
  const months = Math.max(1, Number(input.contract_length_months || 12));
  const isRecurring = input.deal_type === "recurring" || input.deal_type === "hybrid";
  const isOneTime = input.deal_type === "one_time" || input.deal_type === "hybrid";

  let monthlyRate = 0;
  if (isRecurring) {
    if (input.recurring_model === "per_connector") {
      const rate = Number(input.rate_per_connector);
      const effectiveRate = rate && rate > 0 ? rate : PER_CONNECTOR_RATE;
      monthlyRate = (Number(input.connector_count) || 0) * effectiveRate;
    } else {
      monthlyRate = Number(input.monthly_rate) || 0;
    }
  }
  const mrr = monthlyRate;
  const arr = mrr * 12;
  const tcv = mrr * months;
  const oneTime = isOneTime ? Number(input.one_time_value) || 0 : 0;
  const year1Revenue = arr + oneTime;
  return { monthlyRate, mrr, arr, tcv, oneTime, year1Revenue };
}

export interface Activity {
  id: string;
  partner_id: string;
  deal_id: string | null;
  stakeholder_id: string | null;
  type: ActivityType;
  summary: string;
  outcome: string | null;
  next_step: string | null;
  next_step_date: string | null;
  logged_by_user_id: string | null;
  activity_date: string;
  created_at: string;
  updated_at: string;
}

export type ChargerRelationshipType = "owner" | "cpo" | "cms" | "oem" | "service_partner";

export interface AccountOpsSnapshot {
  customer_id: string;
  charger_count: number;
  sites_count: number;
  incidents_30d: number;
  uptime_pct: number;
  truck_rolls_30d: number;
  estimated_monthly_savings: number;
  relationship_types?: ChargerRelationshipType[];
  relationship_count?: number;
}

export interface ChargerCustomerRelationship {
  id: string;
  charger_id: string;
  customer_id: string;
  relationship_type: ChargerRelationshipType;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export const RELATIONSHIP_LABEL: Record<ChargerRelationshipType, string> = {
  owner: "Owner",
  cpo: "CPO",
  cms: "CMS",
  oem: "OEM",
  service_partner: "Service Partner",
};

export function relationshipContext(
  customerName: string,
  types: ChargerRelationshipType[] | undefined,
  chargerCount: number,
  sitesCount: number,
): string {
  if (!types || types.length === 0 || chargerCount === 0) return "";
  const verbs: Record<ChargerRelationshipType, string> = {
    cms: `manages as CMS`,
    cpo: `operates as CPO`,
    oem: `manufactured`,
    owner: `owns at Site Host locations`,
    service_partner: `services`,
  };
  const primary = types[0];
  return `Showing all ${chargerCount} chargers ${customerName} ${verbs[primary]}` +
    (sitesCount > 0 ? ` across ${sitesCount} sites` : "");
}

export interface AgentOutput {
  id: string;
  deal_id: string;
  agent_name: "scribe" | "closer" | "forecaster";
  output_type: "brief" | "proposal_draft" | "forecast";
  content: Record<string, any>;
  generated_at: string;
  generated_by: string | null;
}

export const TIER_COLORS: Record<GrowthTier, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-slate-400 text-white",
};

// Stage-gate validation: returns null if allowed, error message otherwise.
export function validateStageTransition(deal: Deal, target: DealStage): string | null {
  // Engaged → Qualified
  if (target === "Qualified") {
    if (!deal.value || deal.value <= 0) return "Deal value required to move to Qualified.";
    if (!deal.predicted_close_date && !deal.expected_close_date) return "Predicted close date required to move to Qualified.";
  }
  // Qualified → Proposal Out
  if (target === "Proposal Out") {
    if (!deal.value || deal.value <= 0) return "Deal value required to move to Proposal Out.";
    if (!deal.predicted_close_date && !deal.expected_close_date) return "Predicted close date required to move to Proposal Out.";
    if (!deal.owner && !deal.owner_user_id) return "Owner required to move to Proposal Out.";
  }
  // Closed Lost → loss_reason required
  if (target === "Closed Lost") {
    if (!deal.loss_reason) return "Loss reason required to mark deal as Closed Lost.";
  }
  return null;
}
