/**
 * Shared coordinate validation & normalization for all map components.
 * Ensures markers never end up in the ocean, wrong hemisphere, or swapped.
 */

// Continental US + Alaska + Hawaii bounds (generous)
export const US_BOUNDS = {
  latMin: 18,    // Hawaii south
  latMax: 72,    // Alaska north
  lngMin: -180,  // Alaska/Aleutian west
  lngMax: -66,   // Maine east
};

// Stricter "obviously valid" continental US bounds
export const CONUS_BOUNDS = {
  latMin: 24,
  latMax: 50,
  lngMin: -125,
  lngMax: -66,
};

/**
 * Normalize a [lat, lng] pair:
 * - Coerce strings to numbers
 * - Force US longitude to be negative (sign error fix)
 * - Auto-swap if values look reversed (lat > 90 or |lng| < 25 with |lat| > 50)
 * - Return null if outside US bounds entirely
 */
export function normalizeUSCoords(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined
): [number, number] | null {
  let latN = typeof lat === "string" ? parseFloat(lat) : lat;
  let lngN = typeof lng === "string" ? parseFloat(lng) : lng;

  if (latN == null || lngN == null || isNaN(latN) || isNaN(lngN)) return null;
  if (latN === 0 && lngN === 0) return null;

  // Detect swap: latitude can never exceed 90; or US lat range is ~24-50 while lng is ~-66 to -125
  if (Math.abs(latN) > 90 || (Math.abs(latN) > 60 && Math.abs(lngN) < 50)) {
    [latN, lngN] = [lngN, latN];
  }

  // Fix missing negative sign on US longitude
  // US longitudes are always negative; if positive and in range 66-125, flip it
  if (lngN > 66 && lngN < 180) {
    lngN = -lngN;
  }

  // Validate within US bounds
  if (
    latN < US_BOUNDS.latMin ||
    latN > US_BOUNDS.latMax ||
    lngN < US_BOUNDS.lngMin ||
    lngN > US_BOUNDS.lngMax
  ) {
    return null;
  }

  return [latN, lngN];
}

/** True if coords fall within continental US bounds. */
export function isValidUSCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return normalizeUSCoords(lat, lng) !== null;
}
