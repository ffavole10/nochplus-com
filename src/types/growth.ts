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
  "Service",
  "Commissioning",
  "Campaigns",
  "Warranty",
  "Upgrades",
  "Surveys",
  "Decommissioning",
] as const;

export const STAKEHOLDER_ROLES = [
  "Decision Maker",
  "Influencer",
  "Champion",
  "Blocker",
  "Operational",
  "Unknown",
] as const;
export type StakeholderRole = typeof STAKEHOLDER_ROLES[number];

export const RELATIONSHIP_STATUSES = ["Cold", "Warm", "Hot", "Champion"] as const;
export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number];

export const DEAL_STAGES = [
  "Account Mapped",
  "Relationship Warmed",
  "Expansion Opportunity Identified",
  "Proposal Out",
  "NOCH+ Introduced",
  "Pilot / Contract Signed",
  "Expanded & Recurring",
] as const;
export type DealStage = typeof DEAL_STAGES[number];

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  "Account Mapped": "bg-slate-500/10 text-slate-700 border-slate-300",
  "Relationship Warmed": "bg-blue-500/10 text-blue-700 border-blue-300",
  "Expansion Opportunity Identified": "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  "Proposal Out": "bg-amber-500/10 text-amber-700 border-amber-300",
  "NOCH+ Introduced": "bg-purple-500/10 text-purple-700 border-purple-300",
  "Pilot / Contract Signed": "bg-teal-500/10 text-teal-700 border-teal-300",
  "Expanded & Recurring": "bg-emerald-500/10 text-emerald-700 border-emerald-300",
};

export const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "LinkedIn", "InPerson", "Other"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

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
  partner_id: string;
  deal_name: string;
  description: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  next_action: string | null;
  next_action_date: string | null;
  expected_close_date: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
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

export const TIER_COLORS: Record<GrowthTier, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-slate-400 text-white",
};
