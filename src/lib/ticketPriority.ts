import { AssessmentCharger, TicketPriority } from "@/types/assessment";
import { differenceInDays } from "date-fns";

export function classifyTicketPriority(charger: AssessmentCharger): TicketPriority {
  const { priorityLevel, hasOpenTicket, ticketCreatedDate, assetRecordType } = charger;
  const ageDays = ticketCreatedDate ? differenceInDays(new Date(), new Date(ticketCreatedDate)) : 0;

  if (priorityLevel === "Critical" || (hasOpenTicket && ageDays > 30 && assetRecordType === "DCFC")) {
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
