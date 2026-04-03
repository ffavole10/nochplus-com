/**
 * Deploy Route Optimizer — works with campaign_chargers + campaign_schedule tables
 * Adapts the existing route optimization algorithm to the new Stage 3 data model.
 */

import type { CampaignChargerRow } from "@/hooks/useCampaignChargers";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeployTech {
  technician_id: string;
  name: string;
  home_base_lat: number;
  home_base_lng: number;
  home_base_city: string;
  home_base_airport: string | null;
  color: string;
}

export interface DeployCharger {
  id: string;            // campaign_chargers.id
  charger_id: string;    // charger_records.id
  station_id: string;
  site_name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  estimated_hours: number;
  priority: string;
  technician_id: string;
}

interface Cluster {
  id: number;
  chargers: DeployCharger[];
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
  origin_airport?: string;
  dest_airport?: string;
  estimated_airfare?: number;
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

export interface GeneratedDay {
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
}

export interface TechSummary {
  technician_id: string;
  name: string;
  work_days: number;
  travel_days: number;
  rest_days: number;
  total_chargers: number;
  total_work_hours: number;
  total_flights: number;
  total_drive_miles: number;
  total_drive_hours: number;
}

export interface DeployScheduleResult {
  days: GeneratedDay[];
  summaries: TechSummary[];
  warnings: string[];
  start_date: string;
  end_date: string;
}

// ─── Haversine ──────────────────────────────────────────────────────────────

function toRad(deg: number) { return deg * (Math.PI / 180); }

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function driveDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversine(lat1, lng1, lat2, lng2) * 1.3;
}

function driveTime(miles: number): number { return miles / 50; }

function flightCost(miles: number): number {
  const base = miles < 500 ? 200 : miles < 1000 ? 300 : miles < 1500 ? 400 : 500;
  return Math.round(base * 1.25);
}

function flightPortalToPortal(miles: number): number {
  return 1 + miles / 400 + 1 + 1;
}

// ─── Clustering ─────────────────────────────────────────────────────────────

const CLUSTER_RADIUS = 100;
const FLIGHT_THRESHOLD = 250;
const MAX_CONSEC_WORK = 6;

function clusterChargers(chargers: DeployCharger[]): Cluster[] {
  const clusters: Cluster[] = [];
  const used = new Set<string>();
  let cid = 0;
  const sorted = [...chargers].sort((a, b) => a.lat - b.lat || a.lng - b.lng);

  for (const c of sorted) {
    if (used.has(c.id)) continue;
    const group: DeployCharger[] = [c];
    used.add(c.id);
    for (const o of sorted) {
      if (used.has(o.id)) continue;
      if (haversine(c.lat, c.lng, o.lat, o.lng) <= CLUSTER_RADIUS) {
        group.push(o);
        used.add(o.id);
      }
    }
    const cLat = group.reduce((s, ch) => s + ch.lat, 0) / group.length;
    const cLng = group.reduce((s, ch) => s + ch.lng, 0) / group.length;
    clusters.push({ id: cid++, chargers: group, centroidLat: cLat, centroidLng: cLng });
  }
  return clusters;
}

function sequenceClusters(clusters: Cluster[], lat: number, lng: number): Cluster[] {
  if (clusters.length <= 1) return clusters;
  const ordered: Cluster[] = [];
  const rem = new Set(clusters.map(c => c.id));
  let cLat = lat, cLng = lng;
  while (rem.size > 0) {
    let best: Cluster | null = null;
    let bestD = Infinity;
    for (const cl of clusters) {
      if (!rem.has(cl.id)) continue;
      const d = haversine(cLat, cLng, cl.centroidLat, cl.centroidLng);
      if (d < bestD) { bestD = d; best = cl; }
    }
    if (best) { ordered.push(best); rem.delete(best.id); cLat = best.centroidLat; cLng = best.centroidLng; }
  }
  return ordered;
}

function sequenceInCluster(chargers: DeployCharger[], entryLat: number, entryLng: number): DeployCharger[] {
  if (chargers.length <= 1) return chargers;
  // Group by site first
  const siteGroups = new Map<string, DeployCharger[]>();
  for (const c of chargers) {
    const key = c.site_name || c.address || c.id;
    if (!siteGroups.has(key)) siteGroups.set(key, []);
    siteGroups.get(key)!.push(c);
  }
  // Sequence sites by nearest neighbor
  const siteKeys = Array.from(siteGroups.keys());
  const orderedChargers: DeployCharger[] = [];
  const usedKeys = new Set<string>();
  let cLat = entryLat, cLng = entryLng;
  while (usedKeys.size < siteKeys.length) {
    let bestKey = "";
    let bestDist = Infinity;
    for (const key of siteKeys) {
      if (usedKeys.has(key)) continue;
      const group = siteGroups.get(key)!;
      const d = haversine(cLat, cLng, group[0].lat, group[0].lng);
      if (d < bestDist) { bestDist = d; bestKey = key; }
    }
    if (!bestKey) break;
    usedKeys.add(bestKey);
    const group = siteGroups.get(bestKey)!;
    orderedChargers.push(...group);
    cLat = group[0].lat;
    cLng = group[0].lng;
  }
  return orderedChargers;
}

// ─── Day Packing ────────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function isWorkDay(date: Date, nums: number[]): boolean { return nums.includes(date.getDay()); }

function nextWork(date: Date, nums: number[]): Date {
  const n = new Date(date);
  n.setDate(n.getDate() + 1);
  while (!isWorkDay(n, nums)) n.setDate(n.getDate() + 1);
  return n;
}

function fmt(d: Date): string { return d.toISOString().split("T")[0]; }

interface BuildParams {
  tech: DeployTech;
  chargers: DeployCharger[];
  availableHours: number;
  hrsPerCharger: number;
  workingDayNums: number[];
  startDate: Date;
}

function buildItinerary(p: BuildParams): GeneratedDay[] {
  const { tech, availableHours, hrsPerCharger, workingDayNums, startDate } = p;
  const clusters = clusterChargers(p.chargers);
  const sequenced = sequenceClusters(clusters, tech.home_base_lat, tech.home_base_lng);
  const days: GeneratedDay[] = [];

  let curDate = new Date(startDate);
  while (!isWorkDay(curDate, workingDayNums)) curDate.setDate(curDate.getDate() + 1);

  let dayNum = 1;
  let consecWork = 0;
  let cLat = tech.home_base_lat, cLng = tech.home_base_lng;
  let lastCity = tech.home_base_city;

  const addRestDay = () => {
    days.push({
      technician_id: tech.technician_id, schedule_date: fmt(curDate), day_number: dayNum++,
      day_type: "rest", sites: [], travel_segments: [], overnight_city: lastCity,
      total_work_hours: 0, total_travel_hours: 0, total_drive_miles: 0, notes: "Rest Day",
    });
    consecWork = 0;
    curDate = nextWork(curDate, workingDayNums);
  };

  for (const cluster of sequenced) {
    const distToCluster = driveDistance(cLat, cLng, cluster.centroidLat, cluster.centroidLng);
    const mode: TravelMode = distToCluster > FLIGHT_THRESHOLD ? "flight" : "drive";

    if (mode === "flight") {
      const ptp = flightPortalToPortal(distToCluster);
      if (ptp > 4) {
        if (consecWork >= MAX_CONSEC_WORK) addRestDay();
        const fc = flightCost(distToCluster);
        const destCity = cluster.chargers[0]?.city || "Destination";
        days.push({
          technician_id: tech.technician_id, schedule_date: fmt(curDate), day_number: dayNum++,
          day_type: "travel", sites: [],
          travel_segments: [{
            from_site: lastCity, to_site: destCity, mode: "flight",
            distance_miles: Math.round(distToCluster), duration_hours: Math.round(ptp * 10) / 10,
            cost_estimate: fc, estimated_airfare: fc,
          }],
          overnight_city: destCity,
          total_work_hours: 0, total_travel_hours: Math.round(ptp * 10) / 10, total_drive_miles: 0,
          notes: `✈ Flight to ${destCity}`,
        });
        lastCity = destCity;
        consecWork++;
        curDate = nextWork(curDate, workingDayNums);
      }
      cLat = cluster.centroidLat;
      cLng = cluster.centroidLng;
    } else if (distToCluster > 10) {
      cLat = cluster.centroidLat;
      cLng = cluster.centroidLng;
    }

    const seqChargers = sequenceInCluster(cluster.chargers, cLat, cLng);

    let dayHours = 0;
    let daySites: ScheduleDaySite[] = [];
    let daySegs: TravelSegment[] = [];
    let dayMiles = 0, dayTravel = 0;

    for (let si = 0; si < seqChargers.length; si++) {
      const ch = seqChargers[si];
      const pLat = si === 0 ? cLat : seqChargers[si - 1].lat;
      const pLng = si === 0 ? cLng : seqChargers[si - 1].lng;
      const dd = driveDistance(pLat, pLng, ch.lat, ch.lng);
      const dt = driveTime(dd);
      const wh = ch.estimated_hours || hrsPerCharger;

      if (dayHours + dt + wh > availableHours && daySites.length > 0) {
        if (consecWork >= MAX_CONSEC_WORK) addRestDay();
        days.push({
          technician_id: tech.technician_id, schedule_date: fmt(curDate), day_number: dayNum++,
          day_type: "work", sites: daySites, travel_segments: daySegs,
          overnight_city: seqChargers[si - 1]?.city || lastCity,
          total_work_hours: Math.round(daySites.reduce((s, st) => s + st.estimated_hours, 0) * 10) / 10,
          total_travel_hours: Math.round(dayTravel * 10) / 10,
          total_drive_miles: Math.round(dayMiles), notes: "",
        });
        lastCity = seqChargers[si - 1]?.city || lastCity;
        consecWork++;
        curDate = nextWork(curDate, workingDayNums);
        dayHours = 0; daySites = []; daySegs = []; dayMiles = 0; dayTravel = 0;
      }

      if (dd > 0.5) {
        daySegs.push({
          from_site: daySites.length === 0 ? lastCity : (seqChargers[si - 1]?.site_name || lastCity),
          to_site: ch.site_name, mode: "drive",
          distance_miles: Math.round(dd), duration_hours: Math.round(dt * 10) / 10,
          cost_estimate: 0,
        });
      }

      daySites.push({
        charger_id: ch.charger_id, site_name: ch.site_name,
        address: [ch.address, ch.city, ch.state].filter(Boolean).join(", "),
        lat: ch.lat, lng: ch.lng, estimated_hours: wh,
        arrival_order: daySites.length + 1,
      });

      dayHours += dt + wh;
      dayMiles += dd;
      dayTravel += dt;
      cLat = ch.lat;
      cLng = ch.lng;
    }

    if (daySites.length > 0) {
      if (consecWork >= MAX_CONSEC_WORK) addRestDay();
      days.push({
        technician_id: tech.technician_id, schedule_date: fmt(curDate), day_number: dayNum++,
        day_type: "work", sites: daySites, travel_segments: daySegs,
        overnight_city: seqChargers[seqChargers.length - 1]?.city || lastCity,
        total_work_hours: Math.round(daySites.reduce((s, st) => s + st.estimated_hours, 0) * 10) / 10,
        total_travel_hours: Math.round(dayTravel * 10) / 10,
        total_drive_miles: Math.round(dayMiles), notes: "",
      });
      lastCity = seqChargers[seqChargers.length - 1]?.city || lastCity;
      consecWork++;
      curDate = nextWork(curDate, workingDayNums);
    }
  }

  return days;
}

// ─── Main Entry ─────────────────────────────────────────────────────────────

export interface DeployConfig {
  start_date: string | null;
  deadline: string | null;
  working_days: string[];
  hrs_per_charger: number;
  hrs_per_day: number;
  break_hrs: number;
}

export function generateDeploySchedule(
  config: DeployConfig,
  techs: DeployTech[],
  chargers: DeployCharger[],
): DeployScheduleResult {
  const warnings: string[] = [];
  const allDays: GeneratedDay[] = [];
  const summaries: TechSummary[] = [];

  const workingDayNums = (config.working_days || []).map(d => DAY_ABBR[d] ?? 1);
  const availableHours = config.hrs_per_day - config.break_hrs;
  const startDate = config.start_date ? new Date(config.start_date + "T00:00:00") : new Date();

  if (techs.length === 0) {
    warnings.push("No technicians assigned.");
    return { days: [], summaries: [], warnings, start_date: fmt(startDate), end_date: fmt(startDate) };
  }

  // Group chargers by tech
  const techChargers = new Map<string, DeployCharger[]>();
  techs.forEach(t => techChargers.set(t.technician_id, []));

  let skippedNoCoords = 0;
  for (const c of chargers) {
    if (!c.lat || !c.lng) { skippedNoCoords++; continue; }
    if (techChargers.has(c.technician_id)) {
      techChargers.get(c.technician_id)!.push(c);
    }
  }
  if (skippedNoCoords > 0) {
    warnings.push(`${skippedNoCoords} charger(s) skipped — missing location data.`);
  }

  for (const tech of techs) {
    const chars = techChargers.get(tech.technician_id) || [];
    if (chars.length === 0) {
      warnings.push(`${tech.name} has no chargers assigned.`);
      continue;
    }

    const techDays = buildItinerary({
      tech, chargers: chars, availableHours,
      hrsPerCharger: config.hrs_per_charger,
      workingDayNums, startDate,
    });
    allDays.push(...techDays);

    const wk = techDays.filter(d => d.day_type === "work");
    const tv = techDays.filter(d => d.day_type === "travel");
    const rs = techDays.filter(d => d.day_type === "rest");
    summaries.push({
      technician_id: tech.technician_id, name: tech.name,
      work_days: wk.length, travel_days: tv.length, rest_days: rs.length,
      total_chargers: wk.reduce((s, d) => s + d.sites.length, 0),
      total_work_hours: Math.round(techDays.reduce((s, d) => s + d.total_work_hours, 0) * 10) / 10,
      total_flights: tv.filter(d => d.travel_segments.some(s => s.mode === "flight")).length,
      total_drive_miles: Math.round(techDays.reduce((s, d) => s + d.total_drive_miles, 0)),
      total_drive_hours: Math.round(techDays.reduce((s, d) => s + d.total_travel_hours, 0) * 10) / 10,
    });
  }

  // Deadline check
  if (config.deadline && allDays.length > 0) {
    const lastDate = allDays.map(d => d.schedule_date).sort().pop()!;
    if (lastDate > config.deadline) {
      const diff = Math.ceil((new Date(lastDate).getTime() - new Date(config.deadline).getTime()) / 86400000);
      warnings.push(`Schedule extends ${diff} day(s) past the ${config.deadline} deadline.`);
    }
  }

  const dates = allDays.map(d => d.schedule_date).sort();
  return {
    days: allDays, summaries, warnings,
    start_date: dates[0] || fmt(startDate),
    end_date: dates[dates.length - 1] || fmt(startDate),
  };
}
