export type ChargerStatus = "Critical" | "Degraded" | "Optimal";

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
  issues?: string[];
  technician?: string;
  estimated_cost?: number;
  timeline?: string;
  photos?: string[];
}

export const sampleChargers: Charger[] = [
  {
    charger_id: "C7178",
    station_number: "HEMA042",
    model: "EVPC-S-EVGO-012019-480-0074",
    manufacturer: "BTC",
    address: "1045 W. Laurel Street",
    city: "San Diego",
    state: "CA",
    zip: "92101",
    site_name: "Aladdin Airport Parking - W. Laurel Street",
    serviced: 1,
    status: "Critical",
    summary: "Charger completely out of service. Multiple components missing including display screen, RFID reader housing, and cable connector cover. Evidence of vandalism - spray paint on housing and forced entry marks on cabinet door. Power supply board shows burn damage. Immediate replacement of major components required.",
    full_report_link: "https://drive.google.com/file/d/critical-1",
    start_date: "6/1/2020",
    max_power: 50,
    lat: 32.7328,
    lng: -117.1971,
    issues: ["Vandalism", "Missing Components", "Power Supply Damage", "Screen Damage"],
    technician: "Mike Johnson",
    estimated_cost: 4500,
    timeline: "5-7 business days",
    photos: ["/placeholder.svg", "/placeholder.svg"],
  },
  {
    charger_id: "C7779",
    station_number: "HEMA043",
    model: "EVPC-S-EVGO-012019-480-0075",
    manufacturer: "BTC",
    address: "2100 Pacific Highway",
    city: "San Diego",
    state: "CA",
    zip: "92101",
    site_name: "Harbor View Parking Structure",
    serviced: 1,
    status: "Degraded",
    summary: "Payment systems not functioning properly. RFID reader intermittently unresponsive - requires multiple tap attempts. Credit card reader accepts cards but fails to process 40% of transactions. Cloud connectivity drops every 2-3 hours requiring manual reset. Charging functionality operational when payment bypassed.",
    full_report_link: "https://drive.google.com/file/d/degraded-1",
    start_date: "8/15/2020",
    max_power: 50,
    lat: 32.7262,
    lng: -117.1715,
    issues: ["RFID Malfunction", "Payment Processing", "Cloud Connectivity"],
    technician: "Sarah Chen",
    estimated_cost: 1200,
    timeline: "2-3 business days",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C7177",
    station_number: "HEMA041",
    model: "EVPC-S-EVGO-012019-480-0073",
    manufacturer: "BTC",
    address: "1040 W. Laurel Street",
    city: "San Diego",
    state: "CA",
    zip: "92101",
    site_name: "Aladdin Airport Parking - W. Laurel Street",
    serviced: 1,
    status: "Optimal",
    summary: "Charger fully operational. All systems functioning within normal parameters. Display clear and responsive. RFID and credit card payments processing correctly. Cable and connector in excellent condition. Firmware up to date. No maintenance required at this time.",
    full_report_link: "https://drive.google.com/file/d/optimal-1",
    start_date: "6/1/2020",
    max_power: 50,
    lat: 32.7325,
    lng: -117.1975,
    issues: [],
    technician: "Mike Johnson",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C7877",
    station_number: "RVAM001",
    model: "EVPC-S-EVGO-022020-480-0102",
    manufacturer: "BTC",
    address: "5700 Williamsburg Road",
    city: "Richmond",
    state: "VA",
    zip: "23231",
    site_name: "Richmond Airport Long-Term Parking",
    serviced: 1,
    status: "Critical",
    summary: "CCS cable severely damaged - outer sheath cracked and inner conductors exposed near connector head. Safety hazard - charger locked out. Cable shows signs of repeated vehicle drive-over damage. Requires immediate cable replacement. Secondary issue: cooling fan making grinding noise.",
    full_report_link: "https://drive.google.com/file/d/critical-2",
    start_date: "2/15/2020",
    max_power: 50,
    lat: 37.5052,
    lng: -77.3197,
    issues: ["Cable Damage", "Safety Hazard", "Cooling Fan"],
    technician: "James Wilson",
    estimated_cost: 2800,
    timeline: "3-5 business days",
    photos: ["/placeholder.svg", "/placeholder.svg"],
  },
  {
    charger_id: "C7880",
    station_number: "RVAM002",
    model: "EVPC-S-EVGO-022020-480-0103",
    manufacturer: "BTC",
    address: "5705 Williamsburg Road",
    city: "Richmond",
    state: "VA",
    zip: "23231",
    site_name: "Richmond Airport Long-Term Parking",
    serviced: 1,
    status: "Degraded",
    summary: "Screen display showing partial image only - right third of screen blank. RFID functioning but response time slow (3-4 seconds vs normal 1 second). All payment and charging functions operational. User experience degraded but serviceable.",
    full_report_link: "https://drive.google.com/file/d/degraded-2",
    start_date: "2/15/2020",
    max_power: 50,
    lat: 37.5048,
    lng: -77.3192,
    issues: ["Screen Damage", "RFID Slow Response"],
    technician: "James Wilson",
    estimated_cost: 850,
    timeline: "2-3 business days",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C8001",
    station_number: "LAXP001",
    model: "EVPC-S-EVGO-032021-480-0201",
    manufacturer: "BTC",
    address: "9850 S Sepulveda Blvd",
    city: "Los Angeles",
    state: "CA",
    zip: "90045",
    site_name: "LAX Economy Parking Lot C",
    serviced: 1,
    status: "Degraded",
    summary: "Thermal management system underperforming. Charger throttling to 35kW on hot days (designed for 50kW). Internal temperature readings 15°C above normal. Dust accumulation in air intake vents. Recommend deep cleaning and possible fan replacement.",
    full_report_link: "https://drive.google.com/file/d/degraded-3",
    start_date: "3/20/2021",
    max_power: 50,
    lat: 33.9461,
    lng: -118.3929,
    issues: ["Thermal Throttling", "Dust Accumulation"],
    technician: "David Park",
    estimated_cost: 650,
    timeline: "1-2 business days",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C8002",
    station_number: "LAXP002",
    model: "EVPC-S-EVGO-032021-480-0202",
    manufacturer: "BTC",
    address: "9850 S Sepulveda Blvd",
    city: "Los Angeles",
    state: "CA",
    zip: "90045",
    site_name: "LAX Economy Parking Lot C",
    serviced: 1,
    status: "Optimal",
    summary: "All systems nominal. Recent firmware update successfully applied. Cable wear within acceptable limits. Payment systems responsive. Scheduled for routine maintenance in 60 days.",
    full_report_link: "https://drive.google.com/file/d/optimal-2",
    start_date: "3/20/2021",
    max_power: 50,
    lat: 33.9465,
    lng: -118.3925,
    issues: [],
    technician: "David Park",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C8101",
    station_number: "SFDT001",
    model: "EVPC-S-EVGO-062021-480-0301",
    manufacturer: "BTC",
    address: "450 Mission Street",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    site_name: "Salesforce Transit Center Garage",
    serviced: 1,
    status: "Critical",
    summary: "Complete power supply failure. No response to any inputs. Internal diagnostics show main power board failure. Suspected lightning surge damage based on scorch marks on internal components. Requires full power module replacement and electrical inspection.",
    full_report_link: "https://drive.google.com/file/d/critical-3",
    start_date: "6/10/2021",
    max_power: 50,
    lat: 37.7897,
    lng: -122.3972,
    issues: ["Power Supply Failure", "Lightning Damage"],
    technician: "Emily Rodriguez",
    estimated_cost: 5200,
    timeline: "7-10 business days",
    photos: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
  },
  {
    charger_id: "C8102",
    station_number: "SFDT002",
    model: "EVPC-S-EVGO-062021-480-0302",
    manufacturer: "BTC",
    address: "450 Mission Street",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    site_name: "Salesforce Transit Center Garage",
    serviced: 1,
    status: "Optimal",
    summary: "Fully operational. Minor cosmetic scuff on housing - does not affect operation. All electrical and mechanical systems within specifications.",
    full_report_link: "https://drive.google.com/file/d/optimal-3",
    start_date: "6/10/2021",
    max_power: 50,
    lat: 37.7895,
    lng: -122.3968,
    issues: [],
    technician: "Emily Rodriguez",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C8201",
    station_number: "SDAN003",
    model: "EVPC-S-EVGO-012019-480-0076",
    manufacturer: "BTC",
    address: "3225 Sports Arena Blvd",
    city: "San Diego",
    state: "CA",
    zip: "92110",
    site_name: "Sports Arena Parking",
    serviced: 1,
    status: "Critical",
    summary: "Screen completely shattered - appears to be intentional vandalism. RFID reader pried off and missing. Despite physical damage, internal charging systems still operational. Security camera footage requested. Requires full front panel replacement.",
    full_report_link: "https://drive.google.com/file/d/critical-4",
    start_date: "1/15/2019",
    max_power: 50,
    lat: 32.7573,
    lng: -117.2094,
    issues: ["Vandalism", "Screen Damage", "Missing RFID"],
    technician: "Mike Johnson",
    estimated_cost: 3200,
    timeline: "5-7 business days",
    photos: ["/placeholder.svg", "/placeholder.svg"],
  },
  {
    charger_id: "C8202",
    station_number: "SDAN004",
    model: "EVPC-S-EVGO-012019-480-0077",
    manufacturer: "BTC",
    address: "3225 Sports Arena Blvd",
    city: "San Diego",
    state: "CA",
    zip: "92110",
    site_name: "Sports Arena Parking",
    serviced: 1,
    status: "Degraded",
    summary: "Cloud connectivity board failing. Station drops offline 5-6 times daily. Local charging works but remote monitoring and payment history not syncing. Board replacement ordered.",
    full_report_link: "https://drive.google.com/file/d/degraded-4",
    start_date: "1/15/2019",
    max_power: 50,
    lat: 32.7570,
    lng: -117.2090,
    issues: ["Cloud Board Failure", "Connectivity Issues"],
    technician: "Mike Johnson",
    estimated_cost: 980,
    timeline: "3-4 business days",
    photos: ["/placeholder.svg"],
  },
  {
    charger_id: "C8301",
    station_number: "SDAN005",
    model: "EVPC-S-EVGO-082019-480-0090",
    manufacturer: "BTC",
    address: "7510 Hazard Center Dr",
    city: "San Diego",
    state: "CA",
    zip: "92108",
    site_name: "Hazard Center Mall Parking",
    serviced: 1,
    status: "Degraded",
    summary: "Cable connector showing wear - outer housing cracked but functional. RFID intermittent. Recommend proactive cable replacement to avoid future critical status.",
    full_report_link: "https://drive.google.com/file/d/degraded-5",
    start_date: "8/20/2019",
    max_power: 50,
    lat: 32.7767,
    lng: -117.1577,
    issues: ["Cable Wear", "RFID Intermittent"],
    technician: "Sarah Chen",
    estimated_cost: 1100,
    timeline: "2-3 business days",
    photos: ["/placeholder.svg"],
  },
];

// Expanded dataset to reach ~124 chargers
const additionalLocations = [
  { city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611, site: "Downtown SD Parking" },
  { city: "San Diego", state: "CA", lat: 32.7089, lng: -117.1580, site: "Gaslamp Quarter Garage" },
  { city: "San Diego", state: "CA", lat: 32.7499, lng: -117.2557, site: "Ocean Beach Plaza" },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, site: "DTLA Central Parking" },
  { city: "Los Angeles", state: "CA", lat: 34.0195, lng: -118.4912, site: "Santa Monica Place" },
  { city: "Richmond", state: "VA", lat: 37.5407, lng: -77.4360, site: "Downtown Richmond Deck" },
  { city: "Richmond", state: "VA", lat: 37.5381, lng: -77.4344, site: "Canal Walk Garage" },
  { city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194, site: "Union Square Garage" },
  { city: "San Francisco", state: "CA", lat: 37.7850, lng: -122.4057, site: "Embarcadero Center" },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.0740, site: "Phoenix Sky Harbor" },
];

// Generate additional chargers to fill out the dataset
function generateAdditionalChargers(): Charger[] {
  const additionalChargers: Charger[] = [];
  let idCounter = 8400;
  
  // Generate 5475 additional chargers (5487 total - 12 sample chargers)
  for (let i = 0; i < 5475; i++) {
    const location = additionalLocations[i % additionalLocations.length];
    const statusRoll = Math.random();
    const status: ChargerStatus = statusRoll < 0.86 ? "Optimal" : statusRoll < 0.96 ? "Degraded" : "Critical";
    
    const issues: string[] = [];
    if (status === "Critical") {
      issues.push(...["Power Supply Failure", "Screen Damage"].slice(0, 1 + Math.floor(Math.random() * 2)));
    } else if (status === "Degraded") {
      issues.push(...["RFID Slow", "Minor Cable Wear"].slice(0, 1 + Math.floor(Math.random() * 2)));
    }
    
    additionalChargers.push({
      charger_id: `C${idCounter + i}`,
      station_number: `GEN${String(i).padStart(4, "0")}`,
      model: "EVPC-S-EVGO-012022-480-XXXX",
      manufacturer: "BTC",
      address: `${1000 + (i % 9000)} Main Street`,
      city: location.city,
      state: location.state,
      zip: "00000",
      site_name: location.site,
      serviced: 1,
      status,
      summary: status === "Optimal" 
        ? "All systems operational. No issues found during inspection."
        : status === "Degraded"
        ? "Minor issues detected. Charger functional but requires attention."
        : "Significant issues requiring immediate attention.",
      full_report_link: `https://drive.google.com/file/d/gen-${i}`,
      start_date: "1/1/2022",
      max_power: 50,
      lat: location.lat + (Math.random() - 0.5) * 0.05,
      lng: location.lng + (Math.random() - 0.5) * 0.05,
      issues,
      technician: ["Mike Johnson", "Sarah Chen", "James Wilson", "David Park", "Emily Rodriguez"][Math.floor(Math.random() * 5)],
      estimated_cost: status === "Critical" ? 3000 + Math.floor(Math.random() * 2000) : status === "Degraded" ? 500 + Math.floor(Math.random() * 1000) : 0,
      timeline: status === "Critical" ? "5-7 business days" : status === "Degraded" ? "2-3 business days" : undefined,
      photos: ["/placeholder.svg"],
    });
  }
  
  return additionalChargers;
}

export const allChargers: Charger[] = [...sampleChargers, ...generateAdditionalChargers()];

// Calculate network stats
export function getNetworkStats(chargers: Charger[]) {
  const total = chargers.length;
  const optimal = chargers.filter(c => c.status === "Optimal").length;
  const degraded = chargers.filter(c => c.status === "Degraded").length;
  const critical = chargers.filter(c => c.status === "Critical").length;
  
  const percentOptimal = (optimal / total) * 100;
  const percentCritical = (critical / total) * 100;
  const percentComplete = 100; // All serviced in this campaign
  
  // Health Score Formula: (% Optimal × 50) + ((100 - % Critical) × 30) + (% Complete × 20)
  const healthScore = Math.round(
    (percentOptimal * 0.5) + ((100 - percentCritical) * 0.3) + (percentComplete * 0.2)
  );
  
  return {
    total,
    optimal,
    degraded,
    critical,
    healthScore,
    serviced: total,
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
  const locationMap: Record<string, { critical: number; degraded: number; optimal: number; issues: string[] }> = {};
  
  chargers.forEach(charger => {
    const key = `${charger.city}, ${charger.state}`;
    if (!locationMap[key]) {
      locationMap[key] = { critical: 0, degraded: 0, optimal: 0, issues: [] };
    }
    
    if (charger.status === "Critical") locationMap[key].critical++;
    else if (charger.status === "Degraded") locationMap[key].degraded++;
    else locationMap[key].optimal++;
    
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
      riskScore: data.critical * 3 + data.degraded * 1,
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
    const optimal = siteChargers.filter(c => c.status === "Optimal").length;
    const degraded = siteChargers.filter(c => c.status === "Degraded").length;
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
      optimal,
      degraded,
      critical,
      healthScore: Math.round((optimal / total) * 100),
      lastServiced: siteChargers[0].start_date,
      primaryIssue: topIssue,
    };
  }).sort((a, b) => a.healthScore - b.healthScore);
}
