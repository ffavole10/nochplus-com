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

// US region data with weighted distribution (higher weight = more chargers)
// Following the reference map pattern: heavy coastal concentration, moderate interior
const usRegions = [
  // California - Very Heavy (like reference map showing dense coastal coverage)
  { lat: 32.7, lng: -117.2, spread: 0.3, weight: 180, region: "San Diego", state: "CA" },
  { lat: 33.9, lng: -118.2, spread: 0.5, weight: 250, region: "Los Angeles", state: "CA" },
  { lat: 34.1, lng: -118.8, spread: 0.3, weight: 80, region: "Ventura", state: "CA" },
  { lat: 34.4, lng: -119.7, spread: 0.2, weight: 40, region: "Santa Barbara", state: "CA" },
  { lat: 35.3, lng: -120.6, spread: 0.3, weight: 30, region: "San Luis Obispo", state: "CA" },
  { lat: 36.6, lng: -121.9, spread: 0.2, weight: 35, region: "Monterey", state: "CA" },
  { lat: 37.4, lng: -122.2, spread: 0.4, weight: 200, region: "Bay Area South", state: "CA" },
  { lat: 37.8, lng: -122.4, spread: 0.3, weight: 180, region: "San Francisco", state: "CA" },
  { lat: 38.0, lng: -122.1, spread: 0.3, weight: 60, region: "East Bay North", state: "CA" },
  { lat: 38.6, lng: -121.5, spread: 0.3, weight: 100, region: "Sacramento", state: "CA" },
  { lat: 36.7, lng: -119.8, spread: 0.4, weight: 50, region: "Fresno", state: "CA" },
  { lat: 35.4, lng: -119.0, spread: 0.3, weight: 30, region: "Bakersfield", state: "CA" },
  { lat: 39.5, lng: -121.5, spread: 0.5, weight: 25, region: "Northern CA", state: "CA" },
  { lat: 40.8, lng: -124.2, spread: 0.3, weight: 15, region: "Eureka", state: "CA" },
  
  // Pacific Northwest - Heavy
  { lat: 47.6, lng: -122.3, spread: 0.4, weight: 150, region: "Seattle", state: "WA" },
  { lat: 47.2, lng: -122.5, spread: 0.3, weight: 60, region: "Tacoma", state: "WA" },
  { lat: 48.0, lng: -122.2, spread: 0.3, weight: 40, region: "Everett", state: "WA" },
  { lat: 48.8, lng: -122.5, spread: 0.2, weight: 25, region: "Bellingham", state: "WA" },
  { lat: 47.7, lng: -117.4, spread: 0.3, weight: 35, region: "Spokane", state: "WA" },
  { lat: 45.5, lng: -122.7, spread: 0.4, weight: 120, region: "Portland", state: "OR" },
  { lat: 44.9, lng: -123.0, spread: 0.3, weight: 40, region: "Salem", state: "OR" },
  { lat: 44.0, lng: -123.1, spread: 0.3, weight: 45, region: "Eugene", state: "OR" },
  { lat: 42.3, lng: -122.9, spread: 0.2, weight: 20, region: "Medford", state: "OR" },
  
  // Northeast Corridor - Very Heavy
  { lat: 40.7, lng: -74.0, spread: 0.3, weight: 220, region: "NYC", state: "NY" },
  { lat: 40.9, lng: -73.8, spread: 0.3, weight: 80, region: "Westchester", state: "NY" },
  { lat: 41.0, lng: -73.6, spread: 0.2, weight: 60, region: "Long Island West", state: "NY" },
  { lat: 40.8, lng: -73.2, spread: 0.3, weight: 50, region: "Long Island East", state: "NY" },
  { lat: 40.7, lng: -74.2, spread: 0.2, weight: 70, region: "Newark", state: "NJ" },
  { lat: 40.2, lng: -74.0, spread: 0.3, weight: 45, region: "Jersey Shore", state: "NJ" },
  { lat: 40.0, lng: -75.1, spread: 0.3, weight: 120, region: "Philadelphia", state: "PA" },
  { lat: 40.4, lng: -80.0, spread: 0.3, weight: 60, region: "Pittsburgh", state: "PA" },
  { lat: 42.4, lng: -71.1, spread: 0.4, weight: 140, region: "Boston", state: "MA" },
  { lat: 41.8, lng: -71.4, spread: 0.2, weight: 40, region: "Providence", state: "RI" },
  { lat: 41.3, lng: -72.9, spread: 0.3, weight: 50, region: "New Haven", state: "CT" },
  { lat: 41.8, lng: -72.7, spread: 0.2, weight: 35, region: "Hartford", state: "CT" },
  { lat: 39.3, lng: -76.6, spread: 0.3, weight: 80, region: "Baltimore", state: "MD" },
  { lat: 38.9, lng: -77.0, spread: 0.3, weight: 100, region: "Washington DC", state: "DC" },
  { lat: 37.5, lng: -77.4, spread: 0.3, weight: 50, region: "Richmond", state: "VA" },
  { lat: 36.9, lng: -76.3, spread: 0.3, weight: 55, region: "Norfolk", state: "VA" },
  { lat: 42.9, lng: -78.9, spread: 0.3, weight: 45, region: "Buffalo", state: "NY" },
  { lat: 43.2, lng: -77.6, spread: 0.2, weight: 35, region: "Rochester", state: "NY" },
  { lat: 43.0, lng: -76.1, spread: 0.2, weight: 30, region: "Syracuse", state: "NY" },
  { lat: 42.7, lng: -73.8, spread: 0.2, weight: 30, region: "Albany", state: "NY" },
  { lat: 43.7, lng: -70.3, spread: 0.2, weight: 25, region: "Portland ME", state: "ME" },
  { lat: 43.0, lng: -71.5, spread: 0.2, weight: 25, region: "Manchester", state: "NH" },
  { lat: 44.5, lng: -73.2, spread: 0.2, weight: 20, region: "Burlington", state: "VT" },
  
  // Florida - Heavy
  { lat: 25.8, lng: -80.2, spread: 0.4, weight: 140, region: "Miami", state: "FL" },
  { lat: 26.1, lng: -80.1, spread: 0.3, weight: 60, region: "Fort Lauderdale", state: "FL" },
  { lat: 26.7, lng: -80.1, spread: 0.3, weight: 50, region: "West Palm Beach", state: "FL" },
  { lat: 28.5, lng: -81.4, spread: 0.4, weight: 100, region: "Orlando", state: "FL" },
  { lat: 28.0, lng: -82.5, spread: 0.4, weight: 90, region: "Tampa", state: "FL" },
  { lat: 30.3, lng: -81.7, spread: 0.3, weight: 60, region: "Jacksonville", state: "FL" },
  { lat: 27.0, lng: -82.0, spread: 0.3, weight: 40, region: "Sarasota", state: "FL" },
  { lat: 26.1, lng: -81.8, spread: 0.2, weight: 35, region: "Naples", state: "FL" },
  { lat: 30.4, lng: -84.3, spread: 0.2, weight: 25, region: "Tallahassee", state: "FL" },
  { lat: 30.4, lng: -87.2, spread: 0.2, weight: 25, region: "Pensacola", state: "FL" },
  
  // Texas - Heavy
  { lat: 29.8, lng: -95.4, spread: 0.5, weight: 160, region: "Houston", state: "TX" },
  { lat: 32.8, lng: -96.8, spread: 0.5, weight: 150, region: "Dallas", state: "TX" },
  { lat: 30.3, lng: -97.7, spread: 0.4, weight: 100, region: "Austin", state: "TX" },
  { lat: 29.4, lng: -98.5, spread: 0.4, weight: 80, region: "San Antonio", state: "TX" },
  { lat: 32.8, lng: -97.3, spread: 0.3, weight: 50, region: "Fort Worth", state: "TX" },
  { lat: 31.8, lng: -106.5, spread: 0.3, weight: 35, region: "El Paso", state: "TX" },
  { lat: 27.5, lng: -99.5, spread: 0.3, weight: 25, region: "Laredo", state: "TX" },
  { lat: 27.8, lng: -97.4, spread: 0.3, weight: 30, region: "Corpus Christi", state: "TX" },
  { lat: 33.6, lng: -101.8, spread: 0.3, weight: 20, region: "Lubbock", state: "TX" },
  { lat: 35.2, lng: -101.8, spread: 0.2, weight: 15, region: "Amarillo", state: "TX" },
  
  // Midwest - Moderate to Heavy
  { lat: 41.9, lng: -87.6, spread: 0.5, weight: 160, region: "Chicago", state: "IL" },
  { lat: 42.3, lng: -83.0, spread: 0.4, weight: 80, region: "Detroit", state: "MI" },
  { lat: 42.7, lng: -84.5, spread: 0.2, weight: 30, region: "Lansing", state: "MI" },
  { lat: 43.0, lng: -85.7, spread: 0.2, weight: 35, region: "Grand Rapids", state: "MI" },
  { lat: 45.0, lng: -93.3, spread: 0.4, weight: 70, region: "Minneapolis", state: "MN" },
  { lat: 43.1, lng: -89.4, spread: 0.3, weight: 45, region: "Madison", state: "WI" },
  { lat: 43.0, lng: -87.9, spread: 0.3, weight: 50, region: "Milwaukee", state: "WI" },
  { lat: 41.3, lng: -81.7, spread: 0.3, weight: 55, region: "Cleveland", state: "OH" },
  { lat: 40.0, lng: -83.0, spread: 0.3, weight: 55, region: "Columbus", state: "OH" },
  { lat: 39.1, lng: -84.5, spread: 0.3, weight: 50, region: "Cincinnati", state: "OH" },
  { lat: 39.8, lng: -86.2, spread: 0.3, weight: 50, region: "Indianapolis", state: "IN" },
  { lat: 38.6, lng: -90.2, spread: 0.3, weight: 55, region: "St. Louis", state: "MO" },
  { lat: 39.1, lng: -94.6, spread: 0.3, weight: 45, region: "Kansas City", state: "MO" },
  { lat: 41.3, lng: -96.0, spread: 0.3, weight: 35, region: "Omaha", state: "NE" },
  { lat: 41.6, lng: -93.6, spread: 0.3, weight: 35, region: "Des Moines", state: "IA" },
  { lat: 38.3, lng: -85.8, spread: 0.3, weight: 40, region: "Louisville", state: "KY" },
  
  // Southeast - Moderate to Heavy
  { lat: 33.7, lng: -84.4, spread: 0.4, weight: 110, region: "Atlanta", state: "GA" },
  { lat: 35.2, lng: -80.8, spread: 0.3, weight: 70, region: "Charlotte", state: "NC" },
  { lat: 35.8, lng: -78.6, spread: 0.3, weight: 50, region: "Raleigh", state: "NC" },
  { lat: 36.1, lng: -79.8, spread: 0.2, weight: 25, region: "Greensboro", state: "NC" },
  { lat: 34.2, lng: -77.9, spread: 0.2, weight: 20, region: "Wilmington NC", state: "NC" },
  { lat: 36.2, lng: -86.8, spread: 0.3, weight: 60, region: "Nashville", state: "TN" },
  { lat: 35.1, lng: -90.0, spread: 0.3, weight: 40, region: "Memphis", state: "TN" },
  { lat: 36.0, lng: -83.9, spread: 0.2, weight: 30, region: "Knoxville", state: "TN" },
  { lat: 35.0, lng: -85.3, spread: 0.2, weight: 30, region: "Chattanooga", state: "TN" },
  { lat: 33.5, lng: -86.8, spread: 0.3, weight: 40, region: "Birmingham", state: "AL" },
  { lat: 30.7, lng: -88.0, spread: 0.2, weight: 20, region: "Mobile", state: "AL" },
  { lat: 30.0, lng: -90.1, spread: 0.3, weight: 50, region: "New Orleans", state: "LA" },
  { lat: 30.5, lng: -91.1, spread: 0.2, weight: 25, region: "Baton Rouge", state: "LA" },
  { lat: 32.3, lng: -90.2, spread: 0.2, weight: 20, region: "Jackson MS", state: "MS" },
  { lat: 32.8, lng: -79.9, spread: 0.3, weight: 45, region: "Charleston", state: "SC" },
  { lat: 34.9, lng: -82.4, spread: 0.2, weight: 30, region: "Greenville SC", state: "SC" },
  { lat: 34.0, lng: -81.0, spread: 0.2, weight: 25, region: "Columbia SC", state: "SC" },
  { lat: 32.1, lng: -81.1, spread: 0.2, weight: 25, region: "Savannah", state: "GA" },
  { lat: 34.7, lng: -92.3, spread: 0.3, weight: 25, region: "Little Rock", state: "AR" },
  
  // Mountain/Southwest - Moderate
  { lat: 39.7, lng: -105.0, spread: 0.4, weight: 90, region: "Denver", state: "CO" },
  { lat: 38.8, lng: -104.8, spread: 0.2, weight: 30, region: "Colorado Springs", state: "CO" },
  { lat: 40.0, lng: -105.3, spread: 0.2, weight: 25, region: "Boulder", state: "CO" },
  { lat: 40.6, lng: -105.1, spread: 0.2, weight: 20, region: "Fort Collins", state: "CO" },
  { lat: 33.4, lng: -112.1, spread: 0.5, weight: 100, region: "Phoenix", state: "AZ" },
  { lat: 32.2, lng: -111.0, spread: 0.3, weight: 40, region: "Tucson", state: "AZ" },
  { lat: 35.1, lng: -106.6, spread: 0.3, weight: 40, region: "Albuquerque", state: "NM" },
  { lat: 35.7, lng: -105.9, spread: 0.2, weight: 20, region: "Santa Fe", state: "NM" },
  { lat: 36.2, lng: -115.1, spread: 0.4, weight: 80, region: "Las Vegas", state: "NV" },
  { lat: 39.5, lng: -119.8, spread: 0.2, weight: 30, region: "Reno", state: "NV" },
  { lat: 40.8, lng: -111.9, spread: 0.3, weight: 50, region: "Salt Lake City", state: "UT" },
  { lat: 40.2, lng: -111.7, spread: 0.2, weight: 20, region: "Provo", state: "UT" },
  { lat: 43.6, lng: -116.2, spread: 0.3, weight: 30, region: "Boise", state: "ID" },
  { lat: 45.8, lng: -108.5, spread: 0.2, weight: 12, region: "Billings", state: "MT" },
  { lat: 46.9, lng: -114.0, spread: 0.2, weight: 10, region: "Missoula", state: "MT" },
  { lat: 41.1, lng: -104.8, spread: 0.2, weight: 12, region: "Cheyenne", state: "WY" },
  
  // Plains - Light
  { lat: 35.5, lng: -97.5, spread: 0.3, weight: 40, region: "Oklahoma City", state: "OK" },
  { lat: 36.2, lng: -95.9, spread: 0.3, weight: 35, region: "Tulsa", state: "OK" },
  { lat: 37.7, lng: -97.3, spread: 0.3, weight: 25, region: "Wichita", state: "KS" },
  { lat: 46.9, lng: -96.8, spread: 0.2, weight: 10, region: "Fargo", state: "ND" },
  { lat: 43.5, lng: -96.7, spread: 0.2, weight: 12, region: "Sioux Falls", state: "SD" },
  { lat: 44.0, lng: -103.2, spread: 0.2, weight: 8, region: "Rapid City", state: "SD" },
  { lat: 40.8, lng: -96.7, spread: 0.2, weight: 15, region: "Lincoln", state: "NE" },
  
  // Hawaii & Alaska - Light
  { lat: 21.3, lng: -157.8, spread: 0.3, weight: 35, region: "Honolulu", state: "HI" },
  { lat: 20.8, lng: -156.3, spread: 0.2, weight: 12, region: "Maui", state: "HI" },
  { lat: 61.2, lng: -149.9, spread: 0.3, weight: 15, region: "Anchorage", state: "AK" },
  { lat: 64.8, lng: -147.7, spread: 0.2, weight: 5, region: "Fairbanks", state: "AK" },
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
  
  usRegions.forEach((region) => {
    const count = Math.round((region.weight / totalWeight) * targetTotal);
    
    for (let i = 0; i < count && generated < targetTotal; i++) {
      const statusRoll = Math.random();
      const status: ChargerStatus = statusRoll < 0.86 ? "Optimal" : statusRoll < 0.96 ? "Degraded" : "Critical";
      
      const issues: string[] = [];
      if (status === "Critical") {
        issues.push(...["Power Supply Failure", "Screen Damage"].slice(0, 1 + Math.floor(Math.random() * 2)));
      } else if (status === "Degraded") {
        issues.push(...["RFID Slow", "Minor Cable Wear"].slice(0, 1 + Math.floor(Math.random() * 2)));
      }
      
      // Add random offset within the region's spread
      const latOffset = (Math.random() - 0.5) * 2 * region.spread;
      const lngOffset = (Math.random() - 0.5) * 2 * region.spread;
      
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
        technician: ["Mike Johnson", "Sarah Chen", "James Wilson", "David Park", "Emily Rodriguez"][Math.floor(Math.random() * 5)],
        estimated_cost: status === "Critical" ? 3000 + Math.floor(Math.random() * 2000) : status === "Degraded" ? 500 + Math.floor(Math.random() * 1000) : 0,
        timeline: status === "Critical" ? "5-7 business days" : status === "Degraded" ? "2-3 business days" : undefined,
        photos: ["/placeholder.svg"],
      });
      
      generated++;
    }
  });
  
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
