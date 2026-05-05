export type StrategyStatus = "needs_review" | "active" | "archived";
export type StrategyPosition =
  | "pre_engagement"
  | "active_dialogue"
  | "pilot"
  | "contracted"
  | "at_risk"
  | "champion";
export type StrategyAccountType =
  | "revenue"
  | "strategic_partner"
  | "reference"
  | "beachhead"
  | "defensive";
export type StrategyDecisionRole = "champion" | "decision_maker" | "blocker" | "influencer";
export type StrategyTemperature = "cold" | "warm" | "hot";
export type StrategyPlayStatus = "not_started" | "in_progress" | "complete" | "abandoned";
export type StrategyKpiUnit =
  | "dollar"
  | "percent"
  | "count"
  | "yes_no"
  | "multiplier"
  | "days"
  | "months"
  | "custom";
export type StrategyRiskSeverity = "watch" | "risk" | "critical";
export type StrategyHealth = "on_track" | "at_risk" | "off_track" | "needs_review";
export type KpiHealth = "ahead" | "on_track" | "at_risk" | "behind";

export interface AccountStrategy {
  id: string;
  customer_id: string;
  north_star: string | null;
  account_types: StrategyAccountType[];
  strategic_value: string | null;
  current_position: StrategyPosition;
  status: StrategyStatus;
  owner: string | null;
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
  // Focus 5
  is_focus?: boolean;
  focus_quarter?: string | null;
  focus_reason?: string | null;
  focus_added_at?: string | null;
  focus_added_by?: string | null;
}

export interface FocusHistoryEntry {
  id: string;
  strategy_id: string;
  customer_id: string | null;
  focus_quarter: string;
  focus_reason: string | null;
  added_at: string;
  removed_at: string | null;
  added_by: string | null;
  removed_by: string | null;
  created_at: string;
}

export const FOCUS_5_LIMIT = 5;

export interface StrategyDecisionEntry {
  id: string;
  strategy_id: string;
  contact_id: string | null;
  role: StrategyDecisionRole;
  temperature: StrategyTemperature;
  notes: string | null;
  created_at: string;
}

export interface StrategyPlay {
  id: string;
  strategy_id: string;
  title: string;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  quarter: string | null;
  status: StrategyPlayStatus;
  created_at: string;
  completed_at: string | null;
}

export type StrategyKpiTargetType = "single" | "phased";

export interface QuarterPhasingEntry {
  target_value: number;
  target_percent: number;
}

export type QuarterPhasing = Partial<Record<"Q1" | "Q2" | "Q3" | "Q4" | "Q1_next", QuarterPhasingEntry>>;

export interface StrategyKpi {
  id: string;
  strategy_id: string;
  name: string;
  unit: StrategyKpiUnit;
  target_value: number | null;
  current_value: number;
  target_date: string | null;
  kpi_template_origin: string | null;
  is_primary: boolean;
  is_deferred: boolean;
  deferred_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  target_type?: StrategyKpiTargetType;
  annual_target_value?: number | null;
  quarter_phasing?: QuarterPhasing | null;
  locked_quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null;
}

export interface StrategyKpiActual {
  id: string;
  strategy_kpi_id: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  actual_value: number;
  entered_by: string | null;
  entered_at: string;
  notes: string | null;
  created_at: string;
}

export type PhasedKpiPaceStatus = "starting" | "ahead" | "on_track" | "tracking" | "behind" | "on_schedule";

export interface PhasedKpiStatus {
  status: PhasedKpiPaceStatus;
  currentQuarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  quarterTarget: number;
  weeksElapsed: number;
  expectedToday: number;
  actualToday: number;
  pace: number;
  annualTarget: number;
  annualActual: number;
}

export const PHASING_TEMPLATES: Record<string, { label: string; quarters: Record<"Q1"|"Q2"|"Q3"|"Q4", number> }> = {
  linear: { label: "Linear (steady growth)", quarters: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 } },
  back_loaded: { label: "Back-loaded (typical SaaS)", quarters: { Q1: 5, Q2: 15, Q3: 30, Q4: 50 } },
  front_loaded: { label: "Front-loaded (fast wins)", quarters: { Q1: 40, Q2: 30, Q3: 20, Q4: 10 } },
  hockey_stick: { label: "Hockey stick (partnership ramps)", quarters: { Q1: 5, Q2: 5, Q3: 25, Q4: 65 } },
};

export function getCurrentQuarterInfo(d = new Date()): { quarter: "Q1"|"Q2"|"Q3"|"Q4"; year: number; weeksElapsed: number } {
  const month = d.getMonth();
  const qIdx = Math.floor(month / 3);
  const quarter = (`Q${qIdx + 1}`) as "Q1"|"Q2"|"Q3"|"Q4";
  const qStart = new Date(d.getFullYear(), qIdx * 3, 1);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = Math.min(13, Math.max(1, Math.ceil((d.getTime() - qStart.getTime()) / msPerWeek)));
  return { quarter, year: d.getFullYear(), weeksElapsed };
}

export function computePhasedKpiStatus(
  kpi: StrategyKpi,
  actuals: StrategyKpiActual[],
  now = new Date()
): PhasedKpiStatus {
  const { quarter, year, weeksElapsed } = getCurrentQuarterInfo(now);
  const phasing = (kpi.quarter_phasing || {}) as QuarterPhasing;
  const qEntry = phasing[quarter];
  const quarterTarget = Number(qEntry?.target_value || 0);
  const annualTarget = Number(kpi.annual_target_value || 0);

  const qActuals = actuals.filter((a) => a.strategy_kpi_id === kpi.id && a.quarter === quarter && a.year === year);
  const actualToday = qActuals.reduce((sum, a) => sum + Number(a.actual_value || 0), 0);
  const annualActual = actuals
    .filter((a) => a.strategy_kpi_id === kpi.id && a.year === year)
    .reduce((sum, a) => sum + Number(a.actual_value || 0), 0);

  const expectedToday = quarterTarget * (weeksElapsed / 13);
  const pace = expectedToday > 0 ? actualToday / expectedToday : 0;

  let status: PhasedKpiPaceStatus;
  if (quarterTarget === 0) {
    status = actualToday > 0 ? "ahead" : "on_schedule";
  } else if (weeksElapsed <= 2) {
    status = "starting";
  } else if (pace >= 1.2) {
    status = "ahead";
  } else if (pace >= 1.0) {
    status = "on_track";
  } else if (pace >= 0.75) {
    status = "tracking";
  } else {
    status = "behind";
  }

  return { status, currentQuarter: quarter, year, quarterTarget, weeksElapsed, expectedToday, actualToday, pace, annualTarget, annualActual };
}

export const PHASED_STATUS_LABELS: Record<PhasedKpiPaceStatus, string> = {
  starting: "Starting",
  ahead: "Ahead",
  on_track: "On track",
  tracking: "Tracking",
  behind: "Behind",
  on_schedule: "On schedule",
};

export const PHASED_STATUS_COLORS: Record<PhasedKpiPaceStatus, string> = {
  starting: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-400",
  ahead: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400",
  on_track: "bg-teal-500/10 text-teal-700 border-teal-300 dark:text-teal-400",
  tracking: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400",
  behind: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-400",
  on_schedule: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-400",
};

export interface StrategyRisk {
  id: string;
  strategy_id: string;
  risk_text: string;
  severity: StrategyRiskSeverity;
  created_at: string;
}

export const ACCOUNT_TYPE_LABELS: Record<StrategyAccountType, string> = {
  revenue: "Revenue",
  strategic_partner: "Strategic Partner",
  reference: "Reference",
  beachhead: "Beachhead",
  defensive: "Defensive",
};

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<StrategyAccountType, string> = {
  revenue: "Primary value: ARR, contract value, expansion",
  strategic_partner: "Primary value: access to network, channel, distribution",
  reference: "Primary value: logo, case study, credibility",
  beachhead: "Primary value: opening a new segment or vertical",
  defensive: "Primary value: prevent competitor entrenchment",
};

export const POSITION_LABELS: Record<StrategyPosition, string> = {
  pre_engagement: "Pre-engagement",
  active_dialogue: "Active dialogue",
  pilot: "Pilot",
  contracted: "Contracted",
  at_risk: "At risk",
  champion: "Champion of NOCH+",
};

export interface KpiTemplate {
  name: string;
  unit: StrategyKpiUnit;
  default_target: number | null;
  primary: boolean;
  is_deferred?: boolean;
  deferred_reason?: string;
}

export const REVENUE_ACCOUNT_KPIS: KpiTemplate[] = [
  { name: "Connectors Under NOCH+ Management", unit: "count", default_target: null, primary: true },
  { name: "ARR Signed", unit: "dollar", default_target: null, primary: true },
  { name: "Tier Conversion (Free → Paid)", unit: "yes_no", default_target: 1, primary: true },
  { name: "Account Expansion Rate (12mo)", unit: "multiplier", default_target: 2, primary: true },
  { name: "First-Time Fix Rate", unit: "percent", default_target: 85, primary: false, is_deferred: true, deferred_reason: "Telemetry pending — activates Q4 2026" },
  { name: "Truck Rolls Reduced vs Baseline", unit: "percent", default_target: 50, primary: false, is_deferred: true, deferred_reason: "Telemetry pending — activates Q4 2026" },
];

export const STRATEGIC_PARTNER_KPIS: KpiTemplate[] = [
  { name: "Connectors Accessed Through Partnership", unit: "count", default_target: 500, primary: true },
  { name: "Warm Intros to NOCH+", unit: "count", default_target: 5, primary: true },
  { name: "Joint Pipeline Generated", unit: "dollar", default_target: 1_000_000, primary: true },
  { name: "Co-Marketing Assets Shipped", unit: "count", default_target: 2, primary: true },
];

export const REFERENCE_ACCOUNT_KPIS: KpiTemplate[] = [
  { name: "Case Study Published", unit: "yes_no", default_target: 1, primary: true },
  { name: "Investor Reference Calls Completed", unit: "count", default_target: 3, primary: true },
  { name: "Press Mentions Featuring NOCH+", unit: "count", default_target: 2, primary: true },
  { name: "Logo Usage Permission Secured", unit: "yes_no", default_target: 1, primary: true },
];

export const BEACHHEAD_ACCOUNT_KPIS: KpiTemplate[] = [
  { name: "Logos Won in Segment Post-Beachhead", unit: "count", default_target: 3, primary: true },
  { name: "Segment Pipeline Generated", unit: "dollar", default_target: 2_000_000, primary: true },
  { name: "Avg Deal Size in Segment", unit: "dollar", default_target: 250_000, primary: true },
  { name: "Time From Beachhead to Next Segment Win", unit: "months", default_target: 6, primary: true },
];

export const DEFENSIVE_ACCOUNT_KPIS: KpiTemplate[] = [
  { name: "Competitor Displaced or Blocked", unit: "yes_no", default_target: 1, primary: true },
  { name: "Account Retention", unit: "percent", default_target: 100, primary: true },
  { name: "Competitor Pipeline Reduced", unit: "percent", default_target: 75, primary: true },
  { name: "Strategic Touchpoints per Quarter", unit: "count", default_target: 4, primary: true },
];

export const KPI_TEMPLATES_BY_TYPE: Record<StrategyAccountType, KpiTemplate[]> = {
  revenue: REVENUE_ACCOUNT_KPIS,
  strategic_partner: STRATEGIC_PARTNER_KPIS,
  reference: REFERENCE_ACCOUNT_KPIS,
  beachhead: BEACHHEAD_ACCOUNT_KPIS,
  defensive: DEFENSIVE_ACCOUNT_KPIS,
};

export function getKpiTemplatesForTypes(types: StrategyAccountType[]): KpiTemplate[] {
  const seen = new Set<string>();
  const merged: KpiTemplate[] = [];
  for (const t of types) {
    for (const tpl of KPI_TEMPLATES_BY_TYPE[t] || []) {
      if (!seen.has(tpl.name)) {
        seen.add(tpl.name);
        merged.push(tpl);
      }
    }
  }
  return merged;
}

export function currentQuarter(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q}-${d.getFullYear()}`;
}

export function computeKpiHealth(kpi: Pick<StrategyKpi, "current_value" | "target_value" | "is_deferred">): KpiHealth | null {
  if (kpi.is_deferred) return null;
  const target = Number(kpi.target_value || 0);
  const current = Number(kpi.current_value || 0);
  if (!target) return current > 0 ? "on_track" : "at_risk";
  const ratio = current / target;
  if (ratio >= 1) return "ahead";
  if (ratio >= 0.75) return "on_track";
  if (ratio >= 0.5) return "at_risk";
  return "behind";
}

export function computeStrategyHealth(
  strategy: AccountStrategy,
  kpis: StrategyKpi[],
  plays: StrategyPlay[]
): StrategyHealth {
  if (strategy.status === "needs_review") return "needs_review";
  const reviewedAt = strategy.last_reviewed_at ? new Date(strategy.last_reviewed_at).getTime() : 0;
  const daysSinceReview = reviewedAt ? (Date.now() - reviewedAt) / 86400000 : Infinity;
  if (daysSinceReview > 30) return "needs_review";

  const activeKpis = kpis.filter((k) => k.is_primary && !k.is_deferred);
  const onTrackCount = activeKpis.filter((k) => {
    const h = computeKpiHealth(k);
    return h === "ahead" || h === "on_track";
  }).length;
  const kpiOnTrackRatio = activeKpis.length ? onTrackCount / activeKpis.length : 0;

  const q = currentQuarter();
  const qPlays = plays.filter((p) => !p.quarter || p.quarter === q);
  const movingPlays = qPlays.filter((p) => p.status === "in_progress" || p.status === "complete").length;
  const playsActiveRatio = qPlays.length ? movingPlays / qPlays.length : 0;

  // Recent activity
  const lastPlayMove = plays
    .map((p) => new Date(p.completed_at || p.created_at).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const daysSincePlay = lastPlayMove ? (Date.now() - lastPlayMove) / 86400000 : Infinity;

  if (kpiOnTrackRatio < 0.5 || daysSincePlay > 30) return "off_track";
  if (kpiOnTrackRatio < 0.75) return "at_risk";
  if (kpiOnTrackRatio >= 0.75 && playsActiveRatio >= 0.5) return "on_track";
  return "at_risk";
}

export const STRATEGY_HEALTH_LABELS: Record<StrategyHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
  needs_review: "Needs Review",
};

export const STRATEGY_HEALTH_COLORS: Record<StrategyHealth, string> = {
  on_track: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400",
  at_risk: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400",
  off_track: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-400",
  needs_review: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-400",
};

import { formatCurrency as _formatCurrency } from "@/lib/formatters";

export function formatKpiValue(value: number | null | undefined, unit: StrategyKpiUnit): string {
  const v = Number(value ?? 0);
  switch (unit) {
    case "dollar":
      return _formatCurrency(v);
    case "percent":
      return `${v}%`;
    case "yes_no":
      return v >= 1 ? "Yes" : "No";
    case "multiplier":
      return `${v}x`;
    case "days":
      return `${v}d`;
    case "months":
      return `${v}mo`;
    default:
      return v.toLocaleString();
  }
}
