/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key required).
 * Used to ensure every vendor gets lat/lng coordinates at creation time,
 * even when the vendor doesn't manually place a pin during onboarding.
 *
 * Rate limit: 1 req/s per Nominatim policy — fine for onboarding flow.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "OpenLocalApp/1.0 (openlocalapp.com)";

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Geocodes a Florida vendor by ZIP code first, then falls back to
 * "city, FL, USA". Returns null if neither resolves.
 */
export async function geocodeVendor(
  zipCode: string | null | undefined,
  city: string | null | undefined,
): Promise<{ latitude: number; longitude: number } | null> {
  // Try ZIP code first — most precise
  if (zipCode && /^\d{5}$/.test(zipCode.trim())) {
    const result = await nominatimSearch(`${zipCode.trim()}, Florida, USA`);
    if (result) return result;
  }

  // Fall back to city name + Florida
  if (city && city.trim()) {
    const result = await nominatimSearch(`${city.trim()}, Florida, USA`);
    if (result) return result;
  }

  return null;
}

async function nominatimSearch(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "us",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const results: unknown = await response.json();
    if (!Array.isArray(results) || !results.length) return null;

    const first = results[0] as Partial<NominatimResult>;
    if (typeof first.lat !== "string" || typeof first.lon !== "string") {
      return null;
    }

    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (isNaN(lat) || isNaN(lon)) return null;

    return { latitude: lat, longitude: lon };
  } catch {
    // Network error or timeout — don't block vendor creation
    return null;
  }
}
