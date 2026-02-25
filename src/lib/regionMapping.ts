/**
 * Region Mapping for EV Charger Fleet Scheduling
 * 
 * Edit the REGION_DEFINITIONS constant below to adjust region assignments.
 * Chargers are matched first by city (for California sub-regions), then by state.
 */

export type Region =
  | "SoCal North"
  | "SoCal South"
  | "SoCal Inland"
  | "NorCal"
  | "Pacific Northwest"
  | "Mountain West"
  | "Southeast"
  | "Midwest"
  | "Northeast"
  | "Texas"
  | "Other";

export const ALL_REGIONS: Region[] = [
  "SoCal North",
  "SoCal South",
  "SoCal Inland",
  "NorCal",
  "Pacific Northwest",
  "Mountain West",
  "Southeast",
  "Midwest",
  "Northeast",
  "Texas",
  "Other",
];

export const REGION_COLORS: Record<Region, string> = {
  "SoCal North": "hsl(210, 80%, 55%)",
  "SoCal South": "hsl(260, 70%, 60%)",
  "SoCal Inland": "hsl(30, 85%, 55%)",
  "NorCal": "hsl(160, 70%, 45%)",
  "Pacific Northwest": "hsl(190, 75%, 45%)",
  "Mountain West": "hsl(340, 65%, 55%)",
  "Southeast": "hsl(45, 85%, 50%)",
  "Midwest": "hsl(120, 50%, 45%)",
  "Northeast": "hsl(220, 70%, 50%)",
  "Texas": "hsl(15, 80%, 50%)",
  "Other": "hsl(0, 0%, 55%)",
};

// ── California city-to-region mapping ──────────────────────────
// Cities are matched case-insensitively.

const SOCAL_NORTH_CITIES = new Set([
  // Los Angeles County
  "los angeles", "la", "long beach", "glendale", "santa clarita", "pomona",
  "torrance", "pasadena", "el monte", "downey", "inglewood", "west covina",
  "norwalk", "burbank", "compton", "south gate", "carson", "santa monica",
  "whittier", "hawthorne", "alhambra", "lakewood", "bellflower", "baldwin park",
  "lynwood", "redondo beach", "pico rivera", "montebello", "monterey park",
  "gardena", "huntington park", "arcadia", "diamond bar", "paramount",
  "rosemead", "glendora", "west hollywood", "cerritos", "claremont",
  "covina", "azusa", "la mirada", "rancho palos verdes", "walnut",
  "san dimas", "la verne", "culver city", "manhattan beach", "hermosa beach",
  "calabasas", "malibu", "beverly hills", "lancaster", "palmdale",
  // Ventura County
  "ventura", "oxnard", "thousand oaks", "simi valley", "camarillo", "moorpark",
  "santa paula", "fillmore", "ojai", "port hueneme",
  // Santa Barbara County
  "santa barbara", "santa maria", "lompoc", "goleta", "carpinteria", "solvang",
]);

const SOCAL_SOUTH_CITIES = new Set([
  // San Diego County
  "san diego", "chula vista", "oceanside", "escondido", "carlsbad", "el cajon",
  "vista", "san marcos", "encinitas", "national city", "la mesa",
  "santee", "poway", "imperial beach", "solana beach", "del mar",
  // Orange County
  "anaheim", "santa ana", "irvine", "huntington beach", "garden grove",
  "orange", "fullerton", "costa mesa", "mission viejo", "westminster",
  "newport beach", "buena park", "lake forest", "tustin", "yorba linda",
  "san clemente", "laguna niguel", "laguna beach", "la habra", "fountain valley",
  "placentia", "rancho santa margarita", "aliso viejo", "cypress", "brea",
  "stanton", "dana point", "san juan capistrano", "seal beach", "laguna hills",
]);

const SOCAL_INLAND_CITIES = new Set([
  // Riverside County
  "riverside", "moreno valley", "corona", "temecula", "murrieta", "menifee",
  "indio", "hemet", "perris", "lake elsinore", "cathedral city", "palm desert",
  "palm springs", "coachella", "san jacinto", "beaumont", "wildomar",
  "banning", "eastvale", "jurupa valley", "desert hot springs", "norco",
  // San Bernardino County
  "san bernardino", "fontana", "rancho cucamonga", "ontario", "victorville",
  "rialto", "hesperia", "upland", "apple valley", "redlands", "chino hills",
  "chino", "yucaipa", "montclair", "twentynine palms", "highland", "loma linda",
  "barstow", "colton", "adelanto", "big bear lake",
]);

const NORCAL_CITIES = new Set([
  // Bay Area
  "san francisco", "san jose", "oakland", "fremont", "hayward", "sunnyvale",
  "santa clara", "concord", "vallejo", "berkeley", "richmond", "antioch",
  "daly city", "san mateo", "el cerrito", "livermore", "redwood city",
  "milpitas", "pleasanton", "mountain view", "palo alto", "cupertino",
  "union city", "walnut creek", "menlo park", "foster city", "san rafael",
  "san leandro", "napa", "petaluma", "santa rosa", "novato",
  // Sacramento area
  "sacramento", "elk grove", "roseville", "folsom", "citrus heights",
  "rancho cordova", "davis", "woodland", "vacaville", "fairfield",
  // Central Valley
  "fresno", "stockton", "modesto", "bakersfield", "visalia", "clovis",
  "merced", "tulare", "turlock", "lodi", "manteca", "tracy", "madera",
  // Other NorCal
  "redding", "chico", "eureka", "san luis obispo", "paso robles", "monterey",
  "santa cruz", "salinas", "watsonville", "gilroy",
]);

// ── State-to-region mapping ────────────────────────────────────

const STATE_REGION_MAP: Record<string, Region> = {
  // Pacific Northwest
  WA: "Pacific Northwest", OR: "Pacific Northwest",
  // Mountain West
  AZ: "Mountain West", NV: "Mountain West", CO: "Mountain West",
  UT: "Mountain West", NM: "Mountain West",
  // Southeast
  NC: "Southeast", SC: "Southeast", GA: "Southeast", FL: "Southeast",
  TN: "Southeast", AL: "Southeast",
  // Midwest
  WI: "Midwest", MO: "Midwest", IL: "Midwest", OH: "Midwest",
  MI: "Midwest", IN: "Midwest", MN: "Midwest",
  // Northeast
  NY: "Northeast", PA: "Northeast", NJ: "Northeast", CT: "Northeast",
  MA: "Northeast", VA: "Northeast", MD: "Northeast",
  // Texas
  TX: "Texas",
};

/**
 * Determine the region for a charger based on its city and state.
 */
export function getRegion(city: string | null | undefined, state: string | null | undefined): Region {
  const normalizedState = (state || "").trim().toUpperCase();
  const normalizedCity = (city || "").trim().toLowerCase();

  // California sub-regions: match by city first
  if (normalizedState === "CA" || normalizedState === "CALIFORNIA") {
    if (SOCAL_NORTH_CITIES.has(normalizedCity)) return "SoCal North";
    if (SOCAL_SOUTH_CITIES.has(normalizedCity)) return "SoCal South";
    if (SOCAL_INLAND_CITIES.has(normalizedCity)) return "SoCal Inland";
    if (NORCAL_CITIES.has(normalizedCity)) return "NorCal";
    // Default CA cities to NorCal if not matched
    return "NorCal";
  }

  return STATE_REGION_MAP[normalizedState] || "Other";
}
