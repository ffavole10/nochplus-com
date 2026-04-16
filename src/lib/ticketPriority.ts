import { AssessmentCharger, TicketPriority, PriorityLevel } from "@/types/assessment";
import { differenceInDays } from "date-fns";

/** Map a charger's priorityLevel field to TicketPriority */
export function priorityLevelToTicketPriority(level: PriorityLevel): TicketPriority {
  switch (level) {
    case "Critical": return "P1-Critical";
    case "High": return "P2-High";
    case "Medium": return "P3-Medium";
    case "Low": return "P4-Low";
    default: return "P4-Low";
  }
}

/** Check if a charger is online */
export function isChargerOnline(status: string): boolean {
  return status.startsWith("00") || status.toLowerCase().includes("online");
}

/**
 * Unified schedule priority classification used across all Campaign pages.
 * "Optimal" = online chargers with no issues.
 * Otherwise maps priorityLevel → P1-P4, falling back to ticket-based classification.
 */
export type SchedulePriority = "P1-Critical" | "P2-High" | "P3-Medium" | "P4-Low" | "Optimal";

export function getChargerSchedulePriority(c: AssessmentCharger): SchedulePriority {
  // Online chargers with no priority issue are "Optimal"
  if (isChargerOnline(c.status) && (!c.priorityLevel || c.priorityLevel === "Low")) {
    const hasTicket = !!(c.ticketId || c.ticketCreatedDate);
    if (!hasTicket) return "Optimal";
  }

  // Use priorityLevel if available (this is the primary source of truth from the dataset)
  if (c.priorityLevel) {
    const mapped = priorityLevelToTicketPriority(c.priorityLevel);
    // Online chargers with Low priority and no ticket → Optimal
    if (mapped === "P4-Low" && isChargerOnline(c.status) && !(c.ticketId || c.ticketCreatedDate)) {
      return "Optimal";
    }
    return mapped;
  }

  // Fallback: ticket-based classification
  return classifyTicketPriority(c);
}

export function classifyTicketPriority(charger: AssessmentCharger): TicketPriority {
  const { priorityLevel, hasOpenTicket, ticketCreatedDate, assetRecordType } = charger;
  const ageDays = ticketCreatedDate ? differenceInDays(new Date(), new Date(ticketCreatedDate)) : 0;

  if (priorityLevel === "Critical" || (hasOpenTicket && ageDays > 30 && assetRecordType === "DC | Level 3")) {
    return "P1-Critical";
  }
  if (priorityLevel === "High" || (hasOpenTicket && ageDays > 14)) {
    return "P2-High";
  }
  if (priorityLevel === "Medium" || (hasOpenTicket && ageDays > 7)) {
    return "P3-Medium";
  }
  return "P4-Low";
}

export function getTicketPriorityStats(chargers: AssessmentCharger[]) {
  const ticketChargers = chargers.filter(c => c.ticketId || c.ticketCreatedDate);
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  
  for (const c of ticketChargers) {
    const priority = classifyTicketPriority(c);
    if (priority === "P1-Critical") p1++;
    else if (priority === "P2-High") p2++;
    else if (priority === "P3-Medium") p3++;
    else p4++;
  }

  return { total: ticketChargers.length, p1, p2, p3, p4 };
}
