/**
 * Route Optimization Engine for Campaign Plans
 * 
 * Given a set of chargers with coordinates assigned to technicians with home bases,
 * generates an optimized day-by-day route and schedule.
 */

import { CampaignPlan, PlanTechnician, PlanCharger } from "@/hooks/useCampaignPlan";
import { AssessmentCharger } from "@/types/assessment";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RouteCharger {
  planCharger: PlanCharger;
  charger: AssessmentCharger;
  lat: number;
  lng: number;
}

export interface Cluster {
  id: number;
  chargers: RouteCharger[];
  centroidLat: number;
  centroidLng: number;
}

export type TravelMode = "drive" | "flight";

export interface TravelSegment {
  from_site: string;
  to_site: string;
  mode: TravelMode;
  distance_miles: number;
  duration_hours: number;
  cost_estimate: number;
}

export interface ScheduleDaySite {
  charger_id: string;
  site_name: string;
  address: string;
  lat: number;
  lng: number;
  estimated_hours: number;
  arrival_order: number;
}

export type DayType = "work" | "travel" | "rest" | "off";

export interface GeneratedScheduleDay {
  technician_id: string;
  schedule_date: string;
  day_number: number;
  day_type: DayType;
  sites: ScheduleDaySite[];
  travel_segments: TravelSegment[];
  overnight_city: string;
  total_work_hours: number;
  total_travel_hours: number;
  total_drive_miles: number;
  notes: string;
  locked?: boolean;
}

export interface TechScheduleSummary {
  technician_id: string;
  technician_name: string;
  total_work_days: number;
  total_travel_days: number;
  total_rest_days: number;
  total_chargers: number;
  total_work_hours: number;
  total_flights: number;
  total_drive_miles: number;
  total_drive_hours: number;
  estimated_cost: number;
}

export interface ScheduleResult {
  days: GeneratedScheduleDay[];
  summaries: TechScheduleSummary[];
  warnings: string[];
  start_date: string;
  end_date: string;
  total_days: number;
}

// ─── Haversine Distance ─────────────────────────────────────────────────────

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimatedDriveDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineDistance(lat1, lng1, lat2, lng2) * 1.3;
}

export function estimatedDriveTime(distanceMiles: number): number {
  return distanceMiles / 50; // hours at 50 mph
}

function estimateFlightCost(distanceMiles: number): number {
  let base: number;
  if (distanceMiles < 500) base = 200;
  else if (distanceMiles < 1000) base = 300;
  else if (distanceMiles < 1500) base = 400;
  else base = 500;
  return Math.round(base * 1.25); // 25% buffer
}

function estimateFlightPortalToPortal(distanceMiles: number): number {
  const flightTime = distanceMiles / 400;
  return 1 + flightTime + 1 + 1; // pre + flight + post + airport-to-site
}

// ─── Step 1: Cluster Chargers by Geographic Proximity ───────────────────────

const CLUSTER_RADIUS_MILES = 100;

function clusterChargers(chargers: RouteCharger[]): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();
  let clusterId = 0;

  // Sort by lat for deterministic grouping
  const sorted = [...chargers].sort((a, b) => a.lat - b.lat || a.lng - b.lng);

  for (const c of sorted) {
    if (assigned.has(c.planCharger.charger_id)) continue;

    const clusterChargers: RouteCharger[] = [c];
    assigned.add(c.planCharger.charger_id);

    for (const other of sorted) {
      if (assigned.has(other.planCharger.charger_id)) continue;
      const dist = haversineDistance(c.lat, c.lng, other.lat, other.lng);
      if (dist <= CLUSTER_RADIUS_MILES) {
        clusterChargers.push(other);
        assigned.add(other.planCharger.charger_id);
      }
    }

    const centroidLat = clusterChargers.reduce((s, ch) => s + ch.lat, 0) / clusterChargers.length;
    const centroidLng = clusterChargers.reduce((s, ch) => s + ch.lng, 0) / clusterChargers.length;

    clusters.push({ id: clusterId++, chargers: clusterChargers, centroidLat, centroidLng });
  }

  return clusters;
}

// ─── Step 2: Sequence Clusters (Nearest Neighbor) ───────────────────────────

function sequenceClusters(clusters: Cluster[], startLat: number, startLng: number): Cluster[] {
  if (clusters.length <= 1) return clusters;

  const ordered: Cluster[] = [];
  const remaining = new Set(clusters.map(c => c.id));
  let curLat = startLat;
  let curLng = startLng;

  while (remaining.size > 0) {
    let nearest: Cluster | null = null;
    let nearestDist = Infinity;

    for (const cl of clusters) {
      if (!remaining.has(cl.id)) continue;
      const dist = haversineDistance(curLat, curLng, cl.centroidLat, cl.centroidLng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cl;
      }
    }

    if (nearest) {
      ordered.push(nearest);
      remaining.delete(nearest.id);
      curLat = nearest.centroidLat;
      curLng = nearest.centroidLng;
    }
  }

  return ordered;
}

// ─── Step 3: Determine Travel Mode ──────────────────────────────────────────

const FLIGHT_THRESHOLD_MILES = 250;

function determineTravelMode(distanceMiles: number): TravelMode {
  return distanceMiles > FLIGHT_THRESHOLD_MILES ? "flight" : "drive";
}

// ─── Step 4: Sequence Chargers Within Cluster (Nearest Neighbor) ────────────

function sequenceChargersInCluster(chargers: RouteCharger[], entryLat: number, entryLng: number): RouteCharger[] {
  if (chargers.length <= 1) return chargers;

  const ordered: RouteCharger[] = [];
  const remaining = new Set(chargers.map(c => c.planCharger.charger_id));
  let curLat = entryLat;
  let curLng = entryLng;

  while (remaining.size > 0) {
    let nearest: RouteCharger | null = null;
    let nearestDist = Infinity;

    for (const ch of chargers) {
      if (!remaining.has(ch.planCharger.charger_id)) continue;
      const dist = haversineDistance(curLat, curLng, ch.lat, ch.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = ch;
      }
    }

    if (nearest) {
      ordered.push(nearest);
      remaining.delete(nearest.planCharger.charger_id);
      curLat = nearest.lat;
      curLng = nearest.lng;
    }
  }

  return ordered;
}

// ─── Step 5 & 6: Build Day-by-Day Itinerary ─────────────────────────────────

const DAY_ABBR_TO_NUM: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const EV_RENTAL_PER_DAY = 150;
const MAX_CONSECUTIVE_WORK_DAYS = 6;

function isWorkingDay(date: Date, workingDayNums: number[]): boolean {
  return workingDayNums.includes(date.getDay());
}

function nextWorkingDay(date: Date, workingDayNums: number[]): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isWorkingDay(next, workingDayNums)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface BuildParams {
  plan: CampaignPlan;
  tech: PlanTechnician;
  sequencedClusters: Cluster[];
  availableHours: number;
  workingDayNums: number[];
  startDate: Date;
}

function buildTechItinerary(params: BuildParams): GeneratedScheduleDay[] {
  const { plan, tech, sequencedClusters, availableHours, workingDayNums, startDate } = params;
  const days: GeneratedScheduleDay[] = [];

  let currentDate = new Date(startDate);
  // Advance to first working day
  while (!isWorkingDay(currentDate, workingDayNums)) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let dayNumber = 1;
  let consecutiveWorkDays = 0;
  let curLat = tech.home_base_lat || 0;
  let curLng = tech.home_base_lng || 0;
  let lastCity = tech.home_base_city || "Home Base";

  for (let ci = 0; ci < sequencedClusters.length; ci++) {
    const cluster = sequencedClusters[ci];

    // Travel from previous location to this cluster
    const distToCluster = estimatedDriveDistance(curLat, curLng, cluster.centroidLat, cluster.centroidLng);
    const mode = determineTravelMode(distToCluster);

    if (mode === "flight") {
      const flightTime = estimateFlightPortalToPortal(distToCluster);
      if (flightTime > 4) {
        // Dedicated travel day
        if (consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS) {
          // Insert rest day first
          days.push({
            technician_id: tech.technician_id,
            schedule_date: formatDate(currentDate),
            day_number: dayNumber++,
            day_type: "rest",
            sites: [],
            travel_segments: [],
            overnight_city: lastCity,
            total_work_hours: 0,
            total_travel_hours: 0,
            total_drive_miles: 0,
            notes: "Rest Day",
          });
          consecutiveWorkDays = 0;
          currentDate = nextWorkingDay(currentDate, workingDayNums);
        }

        const flightCost = estimateFlightCost(distToCluster);
        days.push({
          technician_id: tech.technician_id,
          schedule_date: formatDate(currentDate),
          day_number: dayNumber++,
          day_type: "travel",
          sites: [],
          travel_segments: [{
            from_site: lastCity,
            to_site: cluster.chargers[0]?.charger.city || "Destination",
            mode: "flight",
            distance_miles: Math.round(distToCluster),
            duration_hours: Math.round(flightTime * 10) / 10,
            cost_estimate: flightCost,
          }],
          overnight_city: cluster.chargers[0]?.charger.city || "Destination",
          total_work_hours: 0,
          total_travel_hours: Math.round(flightTime * 10) / 10,
          total_drive_miles: 0,
          notes: `✈ Flight to ${cluster.chargers[0]?.charger.city || "Destination"}`,
        });
        consecutiveWorkDays++;
        currentDate = nextWorkingDay(currentDate, workingDayNums);
      }
      curLat = cluster.centroidLat;
      curLng = cluster.centroidLng;
    } else if (distToCluster > 10) {
      // Significant drive — add travel time to first work day
      curLat = cluster.centroidLat;
      curLng = cluster.centroidLng;
    }

    // Sequence chargers within cluster
    const sequenced = sequenceChargersInCluster(cluster.chargers, curLat, curLng);

    // Pack chargers into days
    let dayHours = 0;
    let daySites: ScheduleDaySite[] = [];
    let daySegments: TravelSegment[] = [];
    let dayDriveMiles = 0;
    let dayTravelHours = 0;

    for (let si = 0; si < sequenced.length; si++) {
      const ch = sequenced[si];
      const prevLat = si === 0 ? curLat : sequenced[si - 1].lat;
      const prevLng = si === 0 ? curLng : sequenced[si - 1].lng;
      const driveDist = estimatedDriveDistance(prevLat, prevLng, ch.lat, ch.lng);
      const driveTime = estimatedDriveTime(driveDist);
      const workHours = ch.planCharger.estimated_hours;

      // Check if this charger fits in the current day
      if (dayHours + driveTime + workHours > availableHours && daySites.length > 0) {
        // Close current day
        if (consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS) {
          // Insert rest day
          days.push({
            technician_id: tech.technician_id,
            schedule_date: formatDate(currentDate),
            day_number: dayNumber++,
            day_type: "rest",
            sites: [],
            travel_segments: [],
            overnight_city: lastCity,
            total_work_hours: 0,
            total_travel_hours: 0,
            total_drive_miles: 0,
            notes: "Rest Day",
          });
          consecutiveWorkDays = 0;
          currentDate = nextWorkingDay(currentDate, workingDayNums);
        }

        days.push({
          technician_id: tech.technician_id,
          schedule_date: formatDate(currentDate),
          day_number: dayNumber++,
          day_type: "work",
          sites: daySites,
          travel_segments: daySegments,
          overnight_city: sequenced[si - 1]?.charger.city || lastCity,
          total_work_hours: Math.round(daySites.reduce((s, st) => s + st.estimated_hours, 0) * 10) / 10,
          total_travel_hours: Math.round(dayTravelHours * 10) / 10,
          total_drive_miles: Math.round(dayDriveMiles),
          notes: "",
        });
        lastCity = sequenced[si - 1]?.charger.city || lastCity;
        consecutiveWorkDays++;
        currentDate = nextWorkingDay(currentDate, workingDayNums);

        // Reset day
        dayHours = 0;
        daySites = [];
        daySegments = [];
        dayDriveMiles = 0;
        dayTravelHours = 0;
      }

      // Add charger to current day
      if (driveDist > 0.5) {
        daySegments.push({
          from_site: si === 0 && daySites.length === 0 ? lastCity : (sequenced[si - 1]?.charger.assetName || lastCity),
          to_site: ch.charger.assetName,
          mode: "drive",
          distance_miles: Math.round(driveDist),
          duration_hours: Math.round(driveTime * 10) / 10,
          cost_estimate: 0,
        });
      }

      daySites.push({
        charger_id: ch.planCharger.charger_id,
        site_name: ch.charger.assetName,
        address: `${ch.charger.address || ""}, ${ch.charger.city}, ${ch.charger.state}`.trim(),
        lat: ch.lat,
        lng: ch.lng,
        estimated_hours: workHours,
        arrival_order: daySites.length + 1,
      });

      dayHours += driveTime + workHours;
      dayDriveMiles += driveDist;
      dayTravelHours += driveTime;
      curLat = ch.lat;
      curLng = ch.lng;
    }

    // Flush remaining sites for this cluster
    if (daySites.length > 0) {
      if (consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS) {
        days.push({
          technician_id: tech.technician_id,
          schedule_date: formatDate(currentDate),
          day_number: dayNumber++,
          day_type: "rest",
          sites: [],
          travel_segments: [],
          overnight_city: lastCity,
          total_work_hours: 0,
          total_travel_hours: 0,
          total_drive_miles: 0,
          notes: "Rest Day",
        });
        consecutiveWorkDays = 0;
        currentDate = nextWorkingDay(currentDate, workingDayNums);
      }

      days.push({
        technician_id: tech.technician_id,
        schedule_date: formatDate(currentDate),
        day_number: dayNumber++,
        day_type: "work",
        sites: daySites,
        travel_segments: daySegments,
        overnight_city: sequenced[sequenced.length - 1]?.charger.city || lastCity,
        total_work_hours: Math.round(daySites.reduce((s, st) => s + st.estimated_hours, 0) * 10) / 10,
        total_travel_hours: Math.round(dayTravelHours * 10) / 10,
        total_drive_miles: Math.round(dayDriveMiles),
        notes: "",
      });
      lastCity = sequenced[sequenced.length - 1]?.charger.city || lastCity;
      consecutiveWorkDays++;
      currentDate = nextWorkingDay(currentDate, workingDayNums);
    }
  }

  return days;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function generateOptimizedSchedule(
  plan: CampaignPlan,
  techs: PlanTechnician[],
  planChargers: PlanCharger[],
  chargerLookup: Map<string, AssessmentCharger>,
): ScheduleResult {
  const warnings: string[] = [];
  const allDays: GeneratedScheduleDay[] = [];
  const summaries: TechScheduleSummary[] = [];

  const workingDayNums = (plan.working_days || []).map(d => DAY_ABBR_TO_NUM[d] ?? 1);
  const availableHours = plan.hrs_per_day - plan.break_hrs;
  const startDate = plan.start_date ? new Date(plan.start_date + "T00:00:00") : new Date();

  // Validate
  if (techs.length === 0) {
    warnings.push("No technicians assigned to this plan.");
    return { days: [], summaries: [], warnings, start_date: formatDate(startDate), end_date: formatDate(startDate), total_days: 0 };
  }

  // Build RouteCharger objects (only those with coordinates)
  const routeChargers: RouteCharger[] = [];
  for (const pc of planChargers) {
    const charger = chargerLookup.get(pc.charger_id);
    if (!charger) continue;
    const lat = charger.latitude;
    const lng = charger.longitude;
    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      warnings.push(`Charger ${charger.assetName} has no coordinates and will be skipped.`);
      continue;
    }
    routeChargers.push({ planCharger: pc, charger, lat, lng });
  }

  if (routeChargers.length === 0) {
    warnings.push("No chargers with valid coordinates found.");
    return { days: [], summaries: [], warnings, start_date: formatDate(startDate), end_date: formatDate(startDate), total_days: 0 };
  }

  // Distribute chargers among techs
  // For now: if chargers have technician_id assigned, use that. Otherwise round-robin.
  const techChargerMap = new Map<string, RouteCharger[]>();
  techs.forEach(t => techChargerMap.set(t.technician_id, []));

  const unassigned: RouteCharger[] = [];
  for (const rc of routeChargers) {
    if (rc.planCharger.technician_id && techChargerMap.has(rc.planCharger.technician_id)) {
      techChargerMap.get(rc.planCharger.technician_id)!.push(rc);
    } else {
      unassigned.push(rc);
    }
  }

  // Round-robin unassigned chargers
  let techIdx = 0;
  const techIds = techs.map(t => t.technician_id);
  for (const rc of unassigned) {
    techChargerMap.get(techIds[techIdx % techIds.length])!.push(rc);
    techIdx++;
  }

  // Generate schedule per technician
  for (const tech of techs) {
    const techChargers = techChargerMap.get(tech.technician_id) || [];
    if (techChargers.length === 0) {
      warnings.push(`Technician at ${tech.home_base_city} has no chargers assigned.`);
      continue;
    }

    const homeLat = tech.home_base_lat || 0;
    const homeLng = tech.home_base_lng || 0;

    // Step 1: Cluster
    const clusters = clusterChargers(techChargers);

    // Step 2: Sequence clusters
    const sequenced = sequenceClusters(clusters, homeLat, homeLng);

    // Step 5: Build itinerary
    const techDays = buildTechItinerary({
      plan,
      tech,
      sequencedClusters: sequenced,
      availableHours,
      workingDayNums,
      startDate,
    });

    allDays.push(...techDays);

    // Build summary
    const workDays = techDays.filter(d => d.day_type === "work");
    const travelDays = techDays.filter(d => d.day_type === "travel");
    const restDays = techDays.filter(d => d.day_type === "rest");
    const totalChargers = workDays.reduce((s, d) => s + d.sites.length, 0);
    const totalWorkHours = techDays.reduce((s, d) => s + d.total_work_hours, 0);
    const totalDriveMiles = techDays.reduce((s, d) => s + d.total_drive_miles, 0);
    const totalDriveHours = techDays.reduce((s, d) => s + d.total_travel_hours, 0);
    const flights = travelDays.filter(d => d.travel_segments.some(s => s.mode === "flight"));
    const flightCosts = travelDays.reduce((s, d) => s + d.travel_segments.reduce((ss, seg) => ss + seg.cost_estimate, 0), 0);
    const rentalDays = workDays.length;
    const estimatedCost = flightCosts + rentalDays * EV_RENTAL_PER_DAY;

    summaries.push({
      technician_id: tech.technician_id,
      technician_name: tech.home_base_city,
      total_work_days: workDays.length,
      total_travel_days: travelDays.length,
      total_rest_days: restDays.length,
      total_chargers: totalChargers,
      total_work_hours: Math.round(totalWorkHours * 10) / 10,
      total_flights: flights.length,
      total_drive_miles: Math.round(totalDriveMiles),
      total_drive_hours: Math.round(totalDriveHours * 10) / 10,
      estimated_cost: Math.round(estimatedCost),
    });
  }

  // Check deadline
  if (plan.deadline && allDays.length > 0) {
    const lastDate = allDays[allDays.length - 1].schedule_date;
    if (lastDate > plan.deadline) {
      const deadlineDate = new Date(plan.deadline + "T00:00:00");
      const lastD = new Date(lastDate + "T00:00:00");
      const diff = Math.ceil((lastD.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
      warnings.push(`Schedule extends ${diff} day(s) past the ${plan.deadline} deadline. Consider adding technicians or adjusting parameters.`);
    }
  }

  const dates = allDays.map(d => d.schedule_date).sort();
  return {
    days: allDays,
    summaries,
    warnings,
    start_date: dates[0] || formatDate(startDate),
    end_date: dates[dates.length - 1] || formatDate(startDate),
    total_days: allDays.length,
  };
}
