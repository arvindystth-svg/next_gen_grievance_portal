import { extractAreaFromText, getWardForCoordinates, BengaluruWard, BENGALURU_WARDS } from "./bengaluruAreas";

export interface ResolvedArea {
  ward: string;
  zone: string;
  locality: string;
  lat: number;
  lng: number;
  source: "nominatim" | "keyword";
  displayName?: string;
}

const BENGALURU_BOUNDS = {
  minLat: 12.75,
  maxLat: 13.15,
  minLng: 77.35,
  maxLng: 77.85,
};

const INDIA_BOUNDS = {
  minLat: 6.5,
  maxLat: 37.1,
  minLng: 68.1,
  maxLng: 97.4,
};

const LOCATION_CUE_PATTERNS = [
  /\b(?:near|in|at|around|opposite|beside|behind)\s+([a-z0-9][a-z0-9\s.'-]{2,40})/gi,
  /\b([a-z][a-z\s.'-]{2,30})\s+(?:area|locality|ward)\b/gi,
];

export function isConfirmedWard(ward?: string | null): boolean {
  if (!ward?.trim()) return false;
  const w = ward.toLowerCase();
  return (
    !w.includes("to be confirmed") &&
    !w.includes("unknown") &&
    !w.startsWith("area -") &&
    /\bward\s+\d+/i.test(ward)
  );
}

export function isInBengaluru(lat: number, lng: number): boolean {
  return (
    lat >= BENGALURU_BOUNDS.minLat &&
    lat <= BENGALURU_BOUNDS.maxLat &&
    lng >= BENGALURU_BOUNDS.minLng &&
    lng <= BENGALURU_BOUNDS.maxLng
  );
}

function isInIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  );
}

function uniqueQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const q of queries) {
    const cleaned = q.replace(/\s+/g, " ").trim();
    if (cleaned.length < 3) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

/** Build geocode search strings from complaint / summary text. */
export function extractGeocodeQueries(
  text: string,
  aiLocality?: string,
  aiWard?: string
): string[] {
  const queries: string[] = [];

  if (aiLocality?.trim() && aiLocality !== "Area-wide issue") {
    queries.push(aiLocality.trim());
  }
  if (aiWard?.trim() && !aiWard.toLowerCase().includes("to be confirmed")) {
    const localityFromWard = aiWard.split(" - ").slice(1).join(" - ").trim();
    if (localityFromWard) queries.push(localityFromWard);
  }

  const extracted = extractAreaFromText(text);
  if (extracted?.locality && extracted.locality !== "Area-wide issue") {
    queries.push(extracted.locality);
  }
  if (extracted?.ward && isConfirmedWard(extracted.ward)) {
    const localityFromWard = extracted.ward.split(" - ").slice(1).join(" - ").trim();
    if (localityFromWard) queries.push(localityFromWard);
  }

  for (const pattern of LOCATION_CUE_PATTERNS) {
    let cueMatch: RegExpExecArray | null;
    const cuePattern = new RegExp(pattern.source, pattern.flags);
    while ((cueMatch = cuePattern.exec(text)) !== null) {
      const captured = cueMatch[1]?.trim();
      if (captured && captured.length >= 3 && captured.length <= 50) {
        queries.push(captured);
      }
    }
  }

  return uniqueQueries(queries).slice(0, 5);
}

function wardFromMatch(ward: BengaluruWard, lat: number, lng: number, source: ResolvedArea["source"], displayName?: string): ResolvedArea {
  return {
    ward: ward.name,
    zone: ward.zone,
    locality: ward.locality,
    lat,
    lng,
    source,
    displayName,
  };
}

/** Extract a human-readable locality from a Nominatim address object */
function localityFromAddress(address: Record<string, string>): string {
  return (
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.road ||
    address.village ||
    address.town ||
    address.city_district ||
    address.county ||
    address.city ||
    address.state_district ||
    address.state ||
    ""
  );
}

/** Build a zone/district label from a Nominatim address object */
function zoneFromAddress(address: Record<string, string>): string {
  const city =
    address.city || address.town || address.village || address.county || address.state_district || "";
  const state = address.state || "";
  if (city && state) return `${city}, ${state}`;
  return city || state || "India";
}

export function resolveAreaFromKeyword(text: string): ResolvedArea | null {
  const extracted = extractAreaFromText(text);
  if (!extracted || !isConfirmedWard(extracted.ward)) return null;

  const fromList = BENGALURU_WARDS.find(
    (w) => w.name === extracted.ward || w.locality === extracted.locality
  );

  const ward = fromList ?? getWardForCoordinates(12.97, 77.59);
  return wardFromMatch(ward, ward.lat, ward.lng, "keyword");
}

export async function geocodeQuery(query: string): Promise<ResolvedArea | null> {
  // Search India-wide first; fall back to Bengaluru-scoped if no India hit
  const searchQueries = [`${query}, India`, `${query}, Bengaluru, Karnataka, India`];

  for (const search of searchQueries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", search);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("addressdetails", "1");

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "NextGen-National-Grievance-Portal/1.0 (citizen grievance portal India)",
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: Record<string, string>;
    }>;

    const hit = results[0];
    if (!hit) continue;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInIndia(lat, lng)) {
      continue;
    }

    const address = hit.address ?? {};
    const locality = localityFromAddress(address) || query;
    const zone = zoneFromAddress(address);

    // If the location is within Bengaluru, also resolve the BBMP ward for richer data
    if (isInBengaluru(lat, lng)) {
      const ward = getWardForCoordinates(lat, lng);
      return wardFromMatch(ward, lat, lng, "nominatim", hit.display_name);
    }

    return {
      ward: locality,
      zone,
      locality,
      lat,
      lng,
      source: "nominatim",
      displayName: hit.display_name,
    };
  }

  return null;
}

export async function resolveAreaFromText(
  text: string,
  options?: { aiLocality?: string; aiWard?: string }
): Promise<ResolvedArea | null> {
  const queries = extractGeocodeQueries(text, options?.aiLocality, options?.aiWard);

  for (const query of queries) {
    try {
      const geocoded = await geocodeQuery(query);
      if (geocoded) return geocoded;
    } catch {
      // try next query
    }
  }

  return resolveAreaFromKeyword(text);
}
