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

// US region data - Limited to specific states: CA, WA, AZ, TX, FL (Orlando), GA, VA, NY, IL
const usRegions = [
  // California - Heavy
  { lat: 32.7, lng: -117.2, spread: 0.3, weight: 200, region: "San Diego", state: "CA" },
  { lat: 33.9, lng: -118.2, spread: 0.5, weight: 280, region: "Los Angeles", state: "CA" },
  { lat: 34.1, lng: -118.8, spread: 0.3, weight: 90, region: "Ventura", state: "CA" },
  { lat: 34.4, lng: -119.7, spread: 0.2, weight: 50, region: "Santa Barbara", state: "CA" },
  { lat: 35.3, lng: -120.6, spread: 0.3, weight: 40, region: "San Luis Obispo", state: "CA" },
  { lat: 36.6, lng: -121.9, spread: 0.2, weight: 45, region: "Monterey", state: "CA" },
  { lat: 37.4, lng: -122.2, spread: 0.4, weight: 220, region: "Bay Area South", state: "CA" },
  { lat: 37.8, lng: -122.4, spread: 0.3, weight: 200, region: "San Francisco", state: "CA" },
  { lat: 38.0, lng: -122.1, spread: 0.3, weight: 70, region: "East Bay North", state: "CA" },
  { lat: 38.6, lng: -121.5, spread: 0.3, weight: 120, region: "Sacramento", state: "CA" },
  { lat: 36.7, lng: -119.8, spread: 0.4, weight: 60, region: "Fresno", state: "CA" },
  { lat: 35.4, lng: -119.0, spread: 0.3, weight: 40, region: "Bakersfield", state: "CA" },
  { lat: 39.5, lng: -121.5, spread: 0.5, weight: 30, region: "Northern CA", state: "CA" },
  
  // Washington
  { lat: 47.6, lng: -122.3, spread: 0.4, weight: 180, region: "Seattle", state: "WA" },
  { lat: 47.2, lng: -122.5, spread: 0.3, weight: 80, region: "Tacoma", state: "WA" },
  { lat: 48.0, lng: -122.2, spread: 0.3, weight: 50, region: "Everett", state: "WA" },
  { lat: 48.8, lng: -122.5, spread: 0.2, weight: 35, region: "Bellingham", state: "WA" },
  { lat: 47.7, lng: -117.4, spread: 0.3, weight: 45, region: "Spokane", state: "WA" },
  { lat: 46.6, lng: -120.5, spread: 0.3, weight: 30, region: "Yakima", state: "WA" },
  
  // Arizona
  { lat: 33.4, lng: -112.1, spread: 0.5, weight: 180, region: "Phoenix", state: "AZ" },
  { lat: 32.2, lng: -111.0, spread: 0.3, weight: 70, region: "Tucson", state: "AZ" },
  { lat: 33.4, lng: -111.9, spread: 0.3, weight: 60, region: "Scottsdale", state: "AZ" },
  { lat: 33.3, lng: -111.8, spread: 0.3, weight: 50, region: "Mesa", state: "AZ" },
  { lat: 35.2, lng: -111.6, spread: 0.2, weight: 25, region: "Flagstaff", state: "AZ" },
  
  // Texas
  { lat: 29.8, lng: -95.4, spread: 0.5, weight: 200, region: "Houston", state: "TX" },
  { lat: 32.8, lng: -96.8, spread: 0.5, weight: 180, region: "Dallas", state: "TX" },
  { lat: 30.3, lng: -97.7, spread: 0.4, weight: 130, region: "Austin", state: "TX" },
  { lat: 29.4, lng: -98.5, spread: 0.4, weight: 100, region: "San Antonio", state: "TX" },
  { lat: 32.8, lng: -97.3, spread: 0.3, weight: 70, region: "Fort Worth", state: "TX" },
  { lat: 31.8, lng: -106.5, spread: 0.3, weight: 45, region: "El Paso", state: "TX" },
  { lat: 27.8, lng: -97.4, spread: 0.3, weight: 40, region: "Corpus Christi", state: "TX" },
  
  // Florida (Orlando area focus)
  { lat: 28.5, lng: -81.4, spread: 0.5, weight: 200, region: "Orlando", state: "FL" },
  { lat: 28.0, lng: -81.7, spread: 0.3, weight: 60, region: "Kissimmee", state: "FL" },
  { lat: 28.8, lng: -81.3, spread: 0.3, weight: 50, region: "Sanford", state: "FL" },
  { lat: 28.4, lng: -81.3, spread: 0.3, weight: 40, region: "Winter Park", state: "FL" },
  
  // Georgia
  { lat: 33.7, lng: -84.4, spread: 0.5, weight: 180, region: "Atlanta", state: "GA" },
  { lat: 33.9, lng: -84.5, spread: 0.3, weight: 60, region: "Marietta", state: "GA" },
  { lat: 33.4, lng: -84.2, spread: 0.3, weight: 50, region: "Stockbridge", state: "GA" },
  { lat: 32.1, lng: -81.1, spread: 0.3, weight: 45, region: "Savannah", state: "GA" },
  { lat: 32.5, lng: -84.0, spread: 0.3, weight: 40, region: "Macon", state: "GA" },
  { lat: 33.1, lng: -83.2, spread: 0.2, weight: 30, region: "Milledgeville", state: "GA" },
  
  // Virginia
  { lat: 37.5, lng: -77.4, spread: 0.3, weight: 120, region: "Richmond", state: "VA" },
  { lat: 36.9, lng: -76.3, spread: 0.4, weight: 100, region: "Norfolk", state: "VA" },
  { lat: 38.8, lng: -77.1, spread: 0.3, weight: 80, region: "Arlington", state: "VA" },
  { lat: 36.8, lng: -76.0, spread: 0.3, weight: 60, region: "Virginia Beach", state: "VA" },
  { lat: 37.3, lng: -79.9, spread: 0.2, weight: 40, region: "Roanoke", state: "VA" },
  { lat: 38.3, lng: -77.5, spread: 0.2, weight: 35, region: "Fredericksburg", state: "VA" },
  
  // New York
  { lat: 40.7, lng: -74.0, spread: 0.3, weight: 250, region: "NYC", state: "NY" },
  { lat: 40.9, lng: -73.8, spread: 0.3, weight: 90, region: "Westchester", state: "NY" },
  { lat: 41.0, lng: -73.6, spread: 0.2, weight: 70, region: "Long Island West", state: "NY" },
  { lat: 40.8, lng: -73.2, spread: 0.3, weight: 60, region: "Long Island East", state: "NY" },
  { lat: 42.9, lng: -78.9, spread: 0.3, weight: 55, region: "Buffalo", state: "NY" },
  { lat: 43.2, lng: -77.6, spread: 0.2, weight: 45, region: "Rochester", state: "NY" },
  { lat: 43.0, lng: -76.1, spread: 0.2, weight: 40, region: "Syracuse", state: "NY" },
  { lat: 42.7, lng: -73.8, spread: 0.2, weight: 40, region: "Albany", state: "NY" },
  
  // Illinois
  { lat: 41.9, lng: -87.6, spread: 0.5, weight: 220, region: "Chicago", state: "IL" },
  { lat: 41.8, lng: -88.0, spread: 0.3, weight: 70, region: "Naperville", state: "IL" },
  { lat: 42.0, lng: -87.7, spread: 0.3, weight: 60, region: "Evanston", state: "IL" },
  { lat: 41.5, lng: -87.6, spread: 0.3, weight: 50, region: "Orland Park", state: "IL" },
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
      const status: ChargerStatus = statusRoll < 0.86 ? "Optimal" : statusRoll < 0.96 ? "Degraded" : "Critical";
      
      const issues: string[] = [];
      if (status === "Critical") {
        issues.push(...["Power Supply Failure", "Screen Damage"].slice(0, 1 + Math.floor(seededRandom(seed + 1) * 2)));
      } else if (status === "Degraded") {
        issues.push(...["RFID Slow", "Minor Cable Wear"].slice(0, 1 + Math.floor(seededRandom(seed + 2) * 2)));
      }
      
      // Add random offset within the region's spread
      const latOffset = (seededRandom(seed + 3) - 0.5) * 2 * region.spread;
      const lngOffset = (seededRandom(seed + 4) - 0.5) * 2 * region.spread;
      
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
        summary: status === "Optimal" 
          ? "All systems operational. No issues found during inspection."
          : status === "Degraded"
          ? "Minor issues detected. Charger functional but requires attention."
          : "Significant issues requiring immediate attention.",
        full_report_link: `https://drive.google.com/file/d/gen-${generated}`,
        start_date: "1/1/2022",
        max_power: 50,
        lat: region.lat + latOffset,
        lng: region.lng + lngOffset,
        issues,
        technician: ["Mike Johnson", "Sarah Chen", "James Wilson", "David Park", "Emily Rodriguez"][Math.floor(seededRandom(seed + 5) * 5)],
        estimated_cost: status === "Critical" ? 3000 + Math.floor(seededRandom(seed + 6) * 2000) : status === "Degraded" ? 500 + Math.floor(seededRandom(seed + 7) * 1000) : 0,
        timeline: status === "Critical" ? "5-7 business days" : status === "Degraded" ? "2-3 business days" : undefined,
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
