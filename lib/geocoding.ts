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
  const search = `${query}, Bengaluru, Karnataka, India`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", search);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "AI-CPGRAMS-Local/1.0 (Bengaluru civic grievance portal)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) return null;

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const hit = results[0];
  if (!hit) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInBengaluru(lat, lng)) {
    return null;
  }

  const ward = getWardForCoordinates(lat, lng);
  return wardFromMatch(ward, lat, lng, "nominatim", hit.display_name);
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
