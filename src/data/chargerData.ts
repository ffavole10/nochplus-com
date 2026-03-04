export type ChargerStatus = "Critical" | "High" | "Medium" | "Low";

export type ChargerCustomer = "evgo" | "evconnect" | "electrify_america" | "chargepoint" | string;

export interface Charger {
  charger_id: string;
  station_number: string;
  model: string;
  manufacturer: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  site_name: string;
  serviced: number;
  status: ChargerStatus;
  summary: string;
  full_report_link: string;
  start_date: string;
  max_power: number;
  lat: number;
  lng: number;
  customer: ChargerCustomer;
  issues?: string[];
  technician?: string;
  estimated_cost?: number;
  timeline?: string;
  photos?: string[];
}

/** Map a DB ChargerRecord to the Charger type used by dashboard components */
export function chargerRecordToCharger(r: {
  id: string;
  station_id: string;
  station_name: string | null;
  serial_number: string | null;
  model: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  site_name: string | null;
  serviced_qty: number | null;
  service_date: string | null;
  report_url: string | null;
  status: string | null;
  summary: string | null;
  start_date: string | null;
  max_power: number | null;
  latitude: number | null;
  longitude: number | null;
  ccs_cable_issue: boolean | null;
  chademo_cable_issue: boolean | null;
  screen_damage: boolean | null;
  cc_reader_issue: boolean | null;
  rfid_reader_issue: boolean | null;
  app_issue: boolean | null;
  holster_issue: boolean | null;
  other_issue: boolean | null;
  power_supply_issue: boolean | null;
  circuit_board_issue: boolean | null;
  power_cabinet_report_url: string | null;
  power_cabinet_status: string | null;
  power_cabinet_summary: string | null;
  service_required: number | null;
  ticket_id?: string | null;
  ticket_created_date?: string | null;
  ticket_solved_date?: string | null;
  ticket_subject?: string | null;
}, customer: string): Charger {
  // Map DB status to 4-level system
  let status: ChargerStatus = "Low";
  const rawStatus = (r.status || "").toLowerCase();
  if (r.status === "Critical") status = "Critical";
  else if (r.status === "Degraded") status = "High";
  else if (r.status === "Optimal" || rawStatus.includes("online")) status = "Low";
  else if (r.status === "High") status = "High";
  else if (r.status === "Medium") status = "Medium";
  // Map "XX - Offline ..." duration statuses to priority levels
  else if (rawStatus.includes("offline 3+ years") || rawStatus.includes("offline 2+ years") || rawStatus.includes("offline 1+ year")) status = "Critical";
  else if (rawStatus.includes("offline 6 months") || rawStatus.includes("offline 3–6 months") || rawStatus.includes("offline 3-6 months")) status = "High";
  else if (rawStatus.includes("offline 1–3 months") || rawStatus.includes("offline 1-3 months") || rawStatus.includes("offline 1–29 days") || rawStatus.includes("offline 1-29 days")) status = "Medium";
  else if (rawStatus.includes("offline") || rawStatus.includes("no comms")) status = "Low";
  else if (!r.status) {
    const hasOpenTicket = !!(r.ticket_id && !r.ticket_solved_date);
    if (hasOpenTicket && r.ticket_created_date) {
      const ageDays = Math.floor((Date.now() - new Date(r.ticket_created_date).getTime()) / 86400000);
      const isDCFC = /dcfc|l3|dc fast/i.test(r.model || "");
      if (ageDays > 30 && isDCFC) status = "Critical";
      else if (ageDays > 14) status = "High";
      else if (ageDays > 7) status = "Medium";
      else status = "Low";
    } else if (hasOpenTicket) {
      status = "High";
    } else if (r.ticket_id && r.ticket_solved_date) {
      status = "Low";
    }
  }

  // Build issues array from boolean flags
  const issues: string[] = [];
  if (r.ccs_cable_issue) issues.push("CCS Cable");
  if (r.chademo_cable_issue) issues.push("CHAdeMO Cable");
  if (r.screen_damage) issues.push("Screen/Display Damage");
  if (r.cc_reader_issue) issues.push("CC Reader");
  if (r.rfid_reader_issue) issues.push("RFID Reader");
  if (r.app_issue) issues.push("App Connectivity");
  if (r.holster_issue) issues.push("Holster");
  if (r.power_supply_issue) issues.push("Power Supply");
  if (r.circuit_board_issue) issues.push("Circuit Board");
  if (r.other_issue) issues.push("Other");

  // Extract charger name, account, and address from ticket_subject when DB fields are empty
  // Pattern: "BTC0329 - Issue - Account (Address)" or "BTC2018 - Issue - Boeing (5868 Approach RD)"
  let stationNumber = r.station_id;
  let siteName = r.site_name || "";
  let address = r.address || "";

  if (r.ticket_subject) {
    const parts = r.ticket_subject.split(" - ").map(p => p.trim());
    if (!r.station_name && parts.length >= 1) {
      stationNumber = parts[0];
    }

    if (parts.length >= 3) {
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        const parenMatch = part.match(/^(.+?)\s*\((.+?)\)\s*$/);
        if (parenMatch) {
          if (!r.site_name && !siteName) siteName = parenMatch[1].trim();
          if (!r.address && !address) address = parenMatch[2].trim();
        } else if (part.startsWith("(") && part.endsWith(")")) {
          const inner = part.slice(1, -1).trim();
          if (!r.address && !address && inner.length > 3) address = inner;
        } else if (!r.site_name && !siteName && i === 2) {
          siteName = part;
        }
      }
    }
  }

  return {
    charger_id: r.id,
    station_number: stationNumber,
    model: r.model || "Unknown",
    manufacturer: "",
    address,
    city: r.city || "",
    state: r.state || "",
    zip: r.zip || "",
    site_name: siteName,
    serviced: r.serviced_qty ?? 0,
    status,
    summary: r.summary || "",
    full_report_link: r.report_url || "",
    start_date: r.start_date || "",
    max_power: r.max_power ?? 0,
    lat: Number(r.latitude) || 0,
    lng: Number(r.longitude) || 0,
    customer: customer as ChargerCustomer,
    issues: issues.length > 0 ? issues : undefined,
  };
}

export const sampleChargers: Charger[] = [];

export const allChargers: Charger[] = [];

// Get chargers filtered by customer
export function getChargersByCustomer(customer: string): Charger[] {
  return allChargers.filter(c => c.customer === customer);
}

// Calculate network stats
export function getNetworkStats(chargers: Charger[]) {
  const total = chargers.length;
  const low = chargers.filter(c => c.status === "Low").length;
  const medium = chargers.filter(c => c.status === "Medium").length;
  const high = chargers.filter(c => c.status === "High").length;
  const critical = chargers.filter(c => c.status === "Critical").length;
  
  const percentLow = (low / total) * 100;
  const percentCritical = (critical / total) * 100;
  const serviced = chargers.filter(c => c.serviced > 0).length;
  const percentComplete = total > 0 ? (serviced / total) * 100 : 0;
  
  // Health Score Formula: (% Low × 50) + ((100 - % Critical) × 30) + (% Complete × 20)
  const healthScore = Math.round(
    (percentLow * 0.5) + ((100 - percentCritical) * 0.3) + (percentComplete * 0.2)
  );
  
  return {
    total,
    low,
    medium,
    high,
    critical,
    healthScore,
    serviced,
    // Legacy aliases
    optimal: low,
    degraded: high + medium,
  };
}

// Get issues breakdown for charts
export function getIssuesBreakdown(chargers: Charger[]) {
  const issueCount: Record<string, number> = {};
  
  chargers.forEach(charger => {
    charger.issues?.forEach(issue => {
      const normalized = normalizeIssueName(issue);
      issueCount[normalized] = (issueCount[normalized] || 0) + 1;
    });
  });
  
  return Object.entries(issueCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function normalizeIssueName(issue: string): string {
  const lowerIssue = issue.toLowerCase();
  if (lowerIssue.includes("screen") || lowerIssue.includes("display")) return "Screen/Display";
  if (lowerIssue.includes("cable") || lowerIssue.includes("connector")) return "Cable/Connector";
  if (lowerIssue.includes("rfid")) return "RFID";
  if (lowerIssue.includes("cloud") || lowerIssue.includes("connectivity")) return "Cloud Board";
  if (lowerIssue.includes("power") || lowerIssue.includes("supply")) return "Power Supply";
  if (lowerIssue.includes("thermal") || lowerIssue.includes("fan") || lowerIssue.includes("cooling")) return "Thermal";
  if (lowerIssue.includes("vandal")) return "Vandalism";
  return "Other";
}

// Get component breakdown for donut chart
export function getComponentBreakdown(chargers: Charger[]) {
  const issues = getIssuesBreakdown(chargers);
  const total = issues.reduce((sum, i) => sum + i.count, 0);
  
  return issues.map(issue => ({
    name: issue.name,
    value: issue.count,
    percentage: total > 0 ? ((issue.count / total) * 100).toFixed(2) : "0",
  }));
}

// Get geographic risk areas
export function getGeographicRisk(chargers: Charger[]) {
  const locationMap: Record<string, { critical: number; high: number; medium: number; low: number; issues: string[] }> = {};
  
  chargers.forEach(charger => {
    const key = `${charger.city}, ${charger.state}`;
    if (!locationMap[key]) {
      locationMap[key] = { critical: 0, high: 0, medium: 0, low: 0, issues: [] };
    }
    
    if (charger.status === "Critical") locationMap[key].critical++;
    else if (charger.status === "High") locationMap[key].high++;
    else if (charger.status === "Medium") locationMap[key].medium++;
    else locationMap[key].low++;
    
    charger.issues?.forEach(issue => {
      if (!locationMap[key].issues.includes(issue)) {
        locationMap[key].issues.push(issue);
      }
    });
  });
  
  return Object.entries(locationMap)
    .map(([location, data]) => ({
      location,
      ...data,
      riskScore: data.critical * 4 + data.high * 2 + data.medium * 1,
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

// Get site performance data
export function getSitePerformance(chargers: Charger[]) {
  const siteMap: Record<string, Charger[]> = {};
  
  chargers.forEach(charger => {
    if (!siteMap[charger.site_name]) {
      siteMap[charger.site_name] = [];
    }
    siteMap[charger.site_name].push(charger);
  });
  
  return Object.entries(siteMap).map(([siteName, siteChargers]) => {
    const total = siteChargers.length;
    const low = siteChargers.filter(c => c.status === "Low").length;
    const medium = siteChargers.filter(c => c.status === "Medium").length;
    const high = siteChargers.filter(c => c.status === "High").length;
    const critical = siteChargers.filter(c => c.status === "Critical").length;
    
    const primaryIssues = siteChargers
      .flatMap(c => c.issues || [])
      .reduce((acc: Record<string, number>, issue) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {});
    
    const topIssue = Object.entries(primaryIssues)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    
    return {
      siteName,
      city: siteChargers[0].city,
      state: siteChargers[0].state,
      totalChargers: total,
      low,
      medium,
      high,
      critical,
      // Legacy
      optimal: low,
      degraded: high + medium,
      healthScore: Math.round((low / total) * 100),
      lastServiced: siteChargers[0].start_date,
      primaryIssue: topIssue,
    };
  }).sort((a, b) => a.healthScore - b.healthScore);
}
