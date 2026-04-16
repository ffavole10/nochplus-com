import { AssessmentCharger } from "@/types/assessment";
import { normalizeUSCoords } from "./coordsValidator";

const GEOCODE_CACHE_KEY = "geocode-cache-v2";

interface GeoCache {
  [key: string]: { lat: number; lng: number } | null;
}

function loadCache(): GeoCache {
  try {
    const stored = localStorage.getItem(GEOCODE_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: GeoCache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full, ignore
  }
}

function locationKey(city: string, state: string, zip: string): string {
  return `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}|${zip.trim()}`;
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "NOCHAssessmentTracker/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      const normalized = normalizeUSCoords(data[0].lat, data[0].lon);
      if (normalized) return { lat: normalized[0], lng: normalized[1] };
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Small random offset to spread chargers at the same location
function jitter(): number {
  return (Math.random() - 0.5) * 0.008; // ~0.5 mile spread
}

export async function geocodeChargers(
  chargers: AssessmentCharger[],
  onProgress?: (done: number, total: number) => void
): Promise<AssessmentCharger[]> {
  const cache = loadCache();

  // Group by unique locations (city+state+zip) to minimize API calls
  const uniqueLocations = new Map<string, { city: string; state: string; zip: string; address: string }>();
  for (const c of chargers) {
    if (c.latitude && c.longitude) continue; // already geocoded
    const key = locationKey(c.city, c.state, c.zip);
    if (!uniqueLocations.has(key) && !cache[key]) {
      uniqueLocations.set(key, { city: c.city, state: c.state, zip: c.zip, address: c.address });
    }
  }

  const toGeocode = Array.from(uniqueLocations.entries());
  const total = toGeocode.length;

  for (let i = 0; i < total; i++) {
    const [key, loc] = toGeocode[i];
    
    // Try city, state, zip first (most reliable)
    let result = await geocodeAddress(`${loc.city}, ${loc.state} ${loc.zip}`);
    
    // Fallback to just city, state
    if (!result && loc.city && loc.state) {
      result = await geocodeAddress(`${loc.city}, ${loc.state}`);
    }

    cache[key] = result;
    onProgress?.(i + 1, total);

    // Nominatim rate limit: 1 req/sec
    if (i < total - 1) await sleep(1100);
  }

  saveCache(cache);

  // Apply coordinates to chargers
  return chargers.map(c => {
    // Validate any pre-existing coords first; clear them if invalid so we can re-geocode/drop
    if (c.latitude && c.longitude) {
      const valid = normalizeUSCoords(c.latitude, c.longitude);
      if (valid) return { ...c, latitude: valid[0], longitude: valid[1] };
    }
    const key = locationKey(c.city, c.state, c.zip);
    const coords = cache[key];
    if (coords) {
      const valid = normalizeUSCoords(coords.lat + jitter(), coords.lng + jitter());
      if (valid) return { ...c, latitude: valid[0], longitude: valid[1] };
    }
    return { ...c, latitude: undefined as any, longitude: undefined as any };
  });
}
