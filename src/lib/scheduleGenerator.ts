import { AssessmentCharger, PriorityLevel, ChargerType } from "@/types/assessment";
import { CampaignConfig, ScheduleDay, ScheduleItem, Campaign, CampaignStatistics } from "@/types/campaign";
import { classifyTicketPriority, getChargerSchedulePriority, SchedulePriority } from "@/lib/ticketPriority";
import { getRegion } from "@/lib/regionMapping";

function isWorkingDay(date: Date, config: CampaignConfig): boolean {
  const day = date.getDay();
  return config.workingDays.includes(day) && !config.excludedDates.includes(date.toISOString().split("T")[0]);
}

function nextWorkingDay(date: Date, config: CampaignConfig): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isWorkingDay(next, config)) {
    next.setDate(next.getDate() + 1);
    // safety: don't loop forever
    if (next.getTime() - date.getTime() > 365 * 24 * 60 * 60 * 1000) break;
  }
  return next;
}

function getWeekNumber(date: Date, startDate: Date): number {
  const diff = date.getTime() - startDate.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

const SCHEDULE_TO_PRIORITY: Record<SchedulePriority, PriorityLevel | null> = {
  "P1-Critical": "Critical",
  "P2-High": "High",
  "P3-Medium": "Medium",
  "P4-Low": "Low",
  "Optimal": null,
};

export function filterChargers(chargers: AssessmentCharger[], config: CampaignConfig): AssessmentCharger[] {
  return chargers.filter(c => {
    if (!config.includeTypes.includes(c.assetRecordType)) return false;
    // Region filter
    if (config.includeRegions.length > 0) {
      const region = getRegion(c.city, c.state);
      if (!config.includeRegions.includes(region)) return false;
    }
    // Use unified schedule priority classification (matches Flagged page logic)
    const sp = getChargerSchedulePriority(c);
    if (sp === "Optimal") {
      return config.includeOptimal !== false;
    }
    const pl = SCHEDULE_TO_PRIORITY[sp];
    if (pl && !config.includePriorities.includes(pl)) return false;
    return true;
  });
}

export function sortChargers(chargers: AssessmentCharger[], sortBy: string): AssessmentCharger[] {
  const copy = [...chargers];
  const priorityOrder: Record<PriorityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const typeOrder: Record<ChargerType, number> = { "DC | Level 3": 0, "AC | Level 2": 1 };

  switch (sortBy) {
    case "priority":
      copy.sort((a, b) => a.priorityScore === b.priorityScore ? 0 : b.priorityScore - a.priorityScore);
      break;
    case "type":
      copy.sort((a, b) => typeOrder[a.assetRecordType] - typeOrder[b.assetRecordType]);
      break;
    case "age":
      copy.sort((a, b) => {
        const da = a.inServiceDate ? new Date(a.inServiceDate).getTime() : Infinity;
        const db = b.inServiceDate ? new Date(b.inServiceDate).getTime() : Infinity;
        return da - db;
      });
      break;
    case "warranty":
      copy.sort((a, b) => {
        const da = a.partsWarrantyEndDate ? new Date(a.partsWarrantyEndDate).getTime() : Infinity;
        const db = b.partsWarrantyEndDate ? new Date(b.partsWarrantyEndDate).getTime() : Infinity;
        return da - db;
      });
      break;
    default:
      copy.sort((a, b) => priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel]);
  }
  return copy;
}

export function generateSchedule(chargers: AssessmentCharger[], config: CampaignConfig): ScheduleDay[] {
  const selected = sortChargers(filterChargers(chargers, config), config.sortBy);
  if (selected.length === 0) return [];

  const effectiveHoursPerDay = config.workingHoursPerDay - config.breakTime;
  const chargersPerDay = Math.max(1, Math.floor(effectiveHoursPerDay / (config.hoursPerCharger + config.travelBuffer)));
  const chargersPerDayTotal = chargersPerDay * config.numberOfTechnicians;

  const schedule: ScheduleDay[] = [];
  const startDate = new Date(config.startDate + "T00:00:00");
  let currentDate = new Date(startDate);

  // Ensure start date is a working day
  while (!isWorkingDay(currentDate, config)) {
    currentDate = nextWorkingDay(currentDate, config);
  }

  let chargerIndex = 0;
  let techIndex = 0;

  while (chargerIndex < selected.length) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const weekNum = getWeekNumber(currentDate, startDate);
    const dayChargers: ScheduleItem[] = [];

    for (let slot = 0; slot < chargersPerDayTotal && chargerIndex < selected.length; slot++) {
      const charger = selected[chargerIndex];
      const techName = config.technicians.length > 0
        ? config.technicians[techIndex % config.technicians.length]
        : `Tech ${(techIndex % config.numberOfTechnicians) + 1}`;

      dayChargers.push({
        chargerId: charger.id,
        assignedTo: techName,
        estimatedHours: config.hoursPerCharger,
        sequenceNumber: slot + 1,
        status: "not_started",
        actualHours: null,
        completedAt: null,
        notes: "",
      });

      chargerIndex++;
      techIndex++;
    }

    schedule.push({
      date: dateStr,
      dayOfWeek: currentDate.getDay(),
      weekNumber: weekNum,
      chargers: dayChargers,
    });

    currentDate = nextWorkingDay(currentDate, config);
  }

  return schedule;
}

export function calculateStatistics(schedule: ScheduleDay[]): CampaignStatistics {
  let totalChargers = 0;
  let completedChargers = 0;
  let inProgressChargers = 0;
  let totalEstimatedHours = 0;
  let totalActualHours = 0;

  const today = new Date().toISOString().split("T")[0];
  let currentWeek = 1;
  const weekSet = new Set<number>();

  for (const day of schedule) {
    weekSet.add(day.weekNumber);
    if (day.date <= today) currentWeek = day.weekNumber;
    for (const item of day.chargers) {
      totalChargers++;
      totalEstimatedHours += item.estimatedHours;
      if (item.status === "completed") {
        completedChargers++;
        totalActualHours += item.actualHours || item.estimatedHours;
      } else if (item.status === "in_progress") {
        inProgressChargers++;
      }
    }
  }

  const totalWeeks = weekSet.size;
  const expectedCompleted = Math.round((currentWeek / totalWeeks) * totalChargers);
  const daysAheadBehind = completedChargers - expectedCompleted;

  return {
    totalChargers,
    completedChargers,
    inProgressChargers,
    scheduledChargers: totalChargers - completedChargers - inProgressChargers,
    totalEstimatedHours,
    totalActualHours,
    currentWeek,
    totalWeeks,
    daysAheadBehind,
  };
}

export function createCampaign(chargers: AssessmentCharger[], config: CampaignConfig): Campaign {
  const schedule = generateSchedule(chargers, config);
  const lastDay = schedule.length > 0 ? schedule[schedule.length - 1].date : config.startDate;
  const name = config.name || `Campaign - ${config.startDate}`;

  return {
    id: `campaign-${Date.now()}`,
    name,
    status: "draft",
    startDate: config.startDate,
    endDate: config.endDate || lastDay,
    createdAt: new Date().toISOString(),
    configuration: { ...config, name },
    schedule,
    statistics: calculateStatistics(schedule),
  };
}
