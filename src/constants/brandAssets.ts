// Brand colors for PDF reports
export const BRAND = {
  tealPrimary: "#0A9E8A",
  tealDark: "#087A6B",
  tealLight: "#E8F7F5",
  tealMid: "#0A9E8A",
  tealAccent: "#B2DDD8",
  coverDark: "#056B5E",
  white: "#FFFFFF",
  darkText: "#1A1A1A",
  gray: "#6B7280",
  grayLight: "#F3F4F6",
  amber: "#F59E0B",
  red: "#EF4444",
  green: "#10B981",
  blue: "#3B82F6",
} as const;

export const NOCH_ADDRESS = "26632 Towne Ctr Dr #300, Lake Forest, CA 92610";
export const NOCH_WEBSITE = "www.nochpower.com";
export const NOCH_COMPANY = "Noch Power Inc.";

/**
 * Load the Noch Power white logo as a base64 data URI at runtime.
 * Falls back to a 1×1 transparent pixel if loading fails.
 */
export async function loadLogoBase64(): Promise<string> {
  try {
    // Use the public image path
    const res = await fetch("/images/noch-power-logo-white.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  }
}
