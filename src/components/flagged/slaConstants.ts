import { TicketPriority } from "@/types/assessment";

// SLA breach thresholds in days — adjust these as needed
export const SLA_THRESHOLDS: Record<TicketPriority, number> = {
  "P1-Critical": 7,
  "P2-High": 14,
  "P3-Medium": 30,
  "P4-Low": 60,
};

// "At Risk" = within this many hours of breaching
export const AT_RISK_HOURS = 48;

export type SlaStatus = "ok" | "at_risk" | "breached";

export function getSlaStatus(priority: TicketPriority, ageDays: number): SlaStatus {
  const threshold = SLA_THRESHOLDS[priority];
  if (ageDays >= threshold) return "breached";
  // at risk if within 48 hours (2 days) of threshold
  if (ageDays >= threshold - (AT_RISK_HOURS / 24)) return "at_risk";
  return "ok";
}

export type AgeBand = "0-30" | "31-60" | "61-90" | "90+";

export function getAgeBand(ageDays: number): AgeBand {
  if (ageDays <= 30) return "0-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays <= 90) return "61-90";
  return "90+";
}

export const AGE_BANDS: AgeBand[] = ["0-30", "31-60", "61-90", "90+"];

export const PRIORITY_KEYS: TicketPriority[] = ["P1-Critical", "P2-High", "P3-Medium", "P4-Low"];

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  "P1-Critical": "hsl(0, 84%, 60%)",
  "P2-High": "hsl(25, 95%, 53%)",
  "P3-Medium": "hsl(45, 93%, 47%)",
  "P4-Low": "hsl(160, 84%, 39%)",
};
