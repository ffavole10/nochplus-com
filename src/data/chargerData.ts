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

// US region data - Limited to specific states: CA, WA, AZ, TX, FL (Orlando), GA, VA, NY, IL
// Each region is assigned to a customer for campaign-specific filtering
// Customer mapping: CA/WA = evgo, AZ/TX = chargepoint, FL/GA/VA = electrify_america, NY/IL = evconnect
const STATE_CUSTOMER_MAP: Record<string, ChargerCustomer> = {
  CA: "evgo",
  WA: "evgo",
  AZ: "chargepoint",
  TX: "chargepoint",
  FL: "electrify_america",
  GA: "electrify_america",
  VA: "electrify_america",
  NY: "evconnect",
  IL: "evconnect",
};

const usRegions = [
  // California (evgo)
  { lat: 32.9, lng: -117.0, spread: 0.2, weight: 200, region: "San Diego", state: "CA" },
  { lat: 34.1, lng: -117.8, spread: 0.35, weight: 280, region: "Los Angeles", state: "CA" },
  { lat: 34.3, lng: -119.1, spread: 0.15, weight: 90, region: "Ventura", state: "CA" },
  { lat: 34.5, lng: -119.9, spread: 0.1, weight: 50, region: "Santa Barbara", state: "CA" },
  { lat: 35.3, lng: -120.4, spread: 0.15, weight: 40, region: "San Luis Obispo", state: "CA" },
  { lat: 36.7, lng: -121.4, spread: 0.1, weight: 45, region: "Monterey", state: "CA" },
  { lat: 37.4, lng: -121.8, spread: 0.25, weight: 220, region: "Bay Area South", state: "CA" },
  { lat: 37.6, lng: -121.9, spread: 0.15, weight: 200, region: "San Francisco", state: "CA" },
  { lat: 37.9, lng: -121.9, spread: 0.2, weight: 70, region: "East Bay North", state: "CA" },
  { lat: 38.6, lng: -121.3, spread: 0.3, weight: 120, region: "Sacramento", state: "CA" },
  { lat: 36.7, lng: -119.8, spread: 0.4, weight: 60, region: "Fresno", state: "CA" },
  { lat: 35.4, lng: -119.0, spread: 0.3, weight: 40, region: "Bakersfield", state: "CA" },
  { lat: 39.5, lng: -121.5, spread: 0.4, weight: 30, region: "Northern CA", state: "CA" },
  
  // Washington (evgo)
  { lat: 47.6, lng: -122.1, spread: 0.25, weight: 180, region: "Seattle", state: "WA" },
  { lat: 47.2, lng: -122.3, spread: 0.2, weight: 80, region: "Tacoma", state: "WA" },
  { lat: 47.9, lng: -122.1, spread: 0.2, weight: 50, region: "Everett", state: "WA" },
  { lat: 48.8, lng: -122.4, spread: 0.15, weight: 35, region: "Bellingham", state: "WA" },
  { lat: 47.7, lng: -117.4, spread: 0.3, weight: 45, region: "Spokane", state: "WA" },
  { lat: 46.6, lng: -120.5, spread: 0.3, weight: 30, region: "Yakima", state: "WA" },
  
  // Arizona (chargepoint)
  { lat: 33.5, lng: -112.0, spread: 0.5, weight: 180, region: "Phoenix", state: "AZ" },
  { lat: 32.2, lng: -110.9, spread: 0.3, weight: 70, region: "Tucson", state: "AZ" },
  { lat: 33.5, lng: -111.9, spread: 0.25, weight: 60, region: "Scottsdale", state: "AZ" },
  { lat: 33.4, lng: -111.8, spread: 0.25, weight: 50, region: "Mesa", state: "AZ" },
  { lat: 35.2, lng: -111.6, spread: 0.2, weight: 25, region: "Flagstaff", state: "AZ" },
  
  // Texas (chargepoint)
  { lat: 29.8, lng: -95.4, spread: 0.4, weight: 200, region: "Houston", state: "TX" },
  { lat: 32.8, lng: -96.8, spread: 0.5, weight: 180, region: "Dallas", state: "TX" },
  { lat: 30.3, lng: -97.7, spread: 0.4, weight: 130, region: "Austin", state: "TX" },
  { lat: 29.4, lng: -98.5, spread: 0.4, weight: 100, region: "San Antonio", state: "TX" },
  { lat: 32.8, lng: -97.3, spread: 0.3, weight: 70, region: "Fort Worth", state: "TX" },
  { lat: 31.8, lng: -106.4, spread: 0.3, weight: 45, region: "El Paso", state: "TX" },
  { lat: 27.9, lng: -97.5, spread: 0.2, weight: 40, region: "Corpus Christi", state: "TX" },
  
  // Florida (electrify_america)
  { lat: 28.5, lng: -81.4, spread: 0.4, weight: 200, region: "Orlando", state: "FL" },
  { lat: 28.3, lng: -81.5, spread: 0.25, weight: 60, region: "Kissimmee", state: "FL" },
  { lat: 28.8, lng: -81.3, spread: 0.25, weight: 50, region: "Sanford", state: "FL" },
  { lat: 28.6, lng: -81.4, spread: 0.2, weight: 40, region: "Winter Park", state: "FL" },
  
  // Georgia (electrify_america)
  { lat: 33.8, lng: -84.4, spread: 0.4, weight: 180, region: "Atlanta", state: "GA" },
  { lat: 33.9, lng: -84.5, spread: 0.25, weight: 60, region: "Marietta", state: "GA" },
  { lat: 33.5, lng: -84.2, spread: 0.25, weight: 50, region: "Stockbridge", state: "GA" },
  { lat: 32.1, lng: -81.2, spread: 0.2, weight: 45, region: "Savannah", state: "GA" },
  { lat: 32.8, lng: -83.6, spread: 0.3, weight: 40, region: "Macon", state: "GA" },
  { lat: 33.1, lng: -83.2, spread: 0.2, weight: 30, region: "Milledgeville", state: "GA" },
  
  // Virginia (electrify_america)
  { lat: 37.5, lng: -77.5, spread: 0.25, weight: 120, region: "Richmond", state: "VA" },
  { lat: 36.9, lng: -76.4, spread: 0.2, weight: 100, region: "Norfolk", state: "VA" },
  { lat: 38.9, lng: -77.2, spread: 0.2, weight: 80, region: "Arlington", state: "VA" },
  { lat: 36.8, lng: -76.1, spread: 0.15, weight: 60, region: "Virginia Beach", state: "VA" },
  { lat: 37.3, lng: -79.9, spread: 0.2, weight: 40, region: "Roanoke", state: "VA" },
  { lat: 38.3, lng: -77.5, spread: 0.2, weight: 35, region: "Fredericksburg", state: "VA" },
  
  // New York (evconnect)
  { lat: 40.8, lng: -73.9, spread: 0.15, weight: 250, region: "NYC", state: "NY" },
  { lat: 41.0, lng: -73.8, spread: 0.2, weight: 90, region: "Westchester", state: "NY" },
  { lat: 40.8, lng: -73.5, spread: 0.15, weight: 70, region: "Long Island West", state: "NY" },
  { lat: 40.9, lng: -73.0, spread: 0.15, weight: 60, region: "Long Island East", state: "NY" },
  { lat: 42.9, lng: -78.8, spread: 0.25, weight: 55, region: "Buffalo", state: "NY" },
  { lat: 43.2, lng: -77.6, spread: 0.2, weight: 45, region: "Rochester", state: "NY" },
  { lat: 43.0, lng: -76.1, spread: 0.2, weight: 40, region: "Syracuse", state: "NY" },
  { lat: 42.7, lng: -73.8, spread: 0.2, weight: 40, region: "Albany", state: "NY" },
  
  // Illinois (evconnect)
  { lat: 41.9, lng: -87.8, spread: 0.35, weight: 220, region: "Chicago", state: "IL" },
  { lat: 41.8, lng: -88.1, spread: 0.25, weight: 70, region: "Naperville", state: "IL" },
  { lat: 42.0, lng: -87.9, spread: 0.2, weight: 60, region: "Evanston", state: "IL" },
  { lat: 41.6, lng: -87.7, spread: 0.25, weight: 50, region: "Orland Park", state: "IL" },
  { lat: 39.8, lng: -89.6, spread: 0.3, weight: 45, region: "Springfield", state: "IL" },
  { lat: 40.7, lng: -89.6, spread: 0.2, weight: 35, region: "Peoria", state: "IL" },
];

// Generate chargers with proper US distribution
function generateAdditionalChargers(): Charger[] {
  const additionalChargers: Charger[] = [];
  let idCounter = 8400;
  
  // Calculate total weight
  const totalWeight = usRegions.reduce((sum, r) => sum + r.weight, 0);
  
  // Distribute 5475 chargers according to weights (5487 total - 12 sample chargers)
  const targetTotal = 5475;
  let generated = 0;
  
  // Use a seeded random for consistent results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  usRegions.forEach((region, regionIndex) => {
    const count = Math.max(1, Math.round((region.weight / totalWeight) * targetTotal));
    
    for (let i = 0; i < count && generated < targetTotal; i++) {
      const seed = regionIndex * 10000 + i;
      const statusRoll = seededRandom(seed);
      const status: ChargerStatus = statusRoll < 0.70 ? "Low" : statusRoll < 0.82 ? "Medium" : statusRoll < 0.93 ? "High" : "Critical";
      
      const issues: string[] = [];
      if (status === "Critical") {
        issues.push(...["Power Supply Failure", "Screen Damage"].slice(0, 1 + Math.floor(seededRandom(seed + 1) * 2)));
      } else if (status === "High") {
        issues.push(...["RFID Malfunction", "Cable Damage"].slice(0, 1 + Math.floor(seededRandom(seed + 2) * 2)));
      } else if (status === "Medium") {
        issues.push(...["RFID Slow", "Minor Cable Wear"].slice(0, 1 + Math.floor(seededRandom(seed + 2) * 2)));
      }
      
      // Add random offset within the region's spread
      const latOffset = (seededRandom(seed + 3) - 0.5) * 2 * region.spread;
      const lngOffset = (seededRandom(seed + 4) - 0.5) * 2 * region.spread;
      
      const customer = STATE_CUSTOMER_MAP[region.state] || "evgo";
      additionalChargers.push({
        charger_id: `C${idCounter + generated}`,
        station_number: `GEN${String(generated).padStart(4, "0")}`,
        model: "EVPC-S-EVGO-012022-480-XXXX",
        manufacturer: "BTC",
        address: `${1000 + (generated % 9000)} Main Street`,
        city: region.region,
        state: region.state,
        zip: "00000",
        site_name: `${region.region} Station ${i + 1}`,
        serviced: 1,
        status,
        customer,
        summary: status === "Low" 
          ? "All systems operational. No issues found during inspection."
          : status === "Medium"
          ? "Minor issues detected. Charger functional but requires attention."
          : status === "High"
          ? "Multiple issues detected requiring scheduled repair."
          : "Significant issues requiring immediate attention.",
        full_report_link: `https://drive.google.com/file/d/gen-${generated}`,
        start_date: "1/1/2022",
        max_power: 50,
        lat: region.lat + latOffset,
        lng: region.lng + lngOffset,
        issues,
        technician: ["Mike Johnson", "Sarah Chen", "James Wilson", "David Park", "Emily Rodriguez"][Math.floor(seededRandom(seed + 5) * 5)],
        estimated_cost: status === "Critical" ? 3000 + Math.floor(seededRandom(seed + 6) * 2000) : (status === "High" || status === "Medium") ? 500 + Math.floor(seededRandom(seed + 7) * 1000) : 0,
        timeline: status === "Critical" ? "5-7 business days" : (status === "High" || status === "Medium") ? "2-3 business days" : undefined,
        photos: ["/placeholder.svg"],
      });
      
      generated++;
    }
  });
  
  console.log(`Generated ${additionalChargers.length} chargers across ${new Set(additionalChargers.map(c => c.state)).size} states:`, 
    [...new Set(additionalChargers.map(c => c.state))].sort());
  
  return additionalChargers;
}

export const allChargers: Charger[] = [...sampleChargers, ...generateAdditionalChargers()];

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
