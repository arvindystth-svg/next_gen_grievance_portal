import { EXPANDED_BENGALURU_WARDS } from "./bengaluruWardsData";

export interface BengaluruWard {
  name: string;
  zone: string;
  lat: number;
  lng: number;
  radius: number;
  locality: string;
  searchTerms?: string[];
}

/** BBMP wards and localities across Bengaluru */
export const BENGALURU_WARDS: BengaluruWard[] = EXPANDED_BENGALURU_WARDS;

const LOCALITY_ALIASES: Record<string, string> = {
  koramangala: "Koramangala",
  bellandur: "Bellandur",
  indiranagar: "Indiranagar",
  "80 feet road": "Indiranagar",
  domlur: "Domlur",
  jayanagar: "Jayanagar",
  hebbal: "Hebbal",
  btm: "BTM Layout",
  "btm layout": "BTM Layout",
  "jp nagar": "JP Nagar",
  whitefield: "Whitefield",
  malleshwaram: "Malleshwaram",
  banashankari: "Banashankari",
  shivajinagar: "Shivajinagar",
  hsr: "HSR Layout",
  "hsr layout": "HSR Layout",
  marathahalli: "Marathahalli",
  "electronic city": "Electronic City",
  yelahanka: "Yelahanka",
  rajajinagar: "Rajajinagar",
  "rr nagar": "RR Nagar",
  "r r nagar": "RR Nagar",
  "kr puram": "KR Puram",
  "k r puram": "KR Puram",
  mahadevapura: "Mahadevapura",
  sarjapur: "Sarjapur Road",
  hoodi: "Hoodi",
  brookefield: "Brookefield",
  varthur: "Varthur",
  kadugodi: "Kadugodi",
  itpl: "ITPL",
  silkboard: "Silk Board",
  "silk board": "Silk Board",
  basavanagudi: "Basavanagudi",
  vijayanagar: "Vijayanagar",
  nagarbhavi: "Nagarbhavi",
  kengeri: "Kengeri",
  yeshwanthpur: "Yeshwanthpur",
  peenya: "Peenya",
  thanisandra: "Thanisandra",
  kammanahalli: "Kammanahalli",
  banaswadi: "Banaswadi",
  frazer: "Frazer Town",
  "frazer town": "Frazer Town",
  ulsoor: "Ulsoor",
  mgroad: "MG Road",
  "mg road": "MG Road",
  bommanahalli: "Bommanahalli",
  electroniccity: "Electronic City",
  hoysala: "Indiranagar",
  "hoysala nagar": "Indiranagar",
};

function wardHaystack(ward: BengaluruWard): string {
  return [
    ward.name,
    ward.locality,
    ward.zone,
    ...(ward.searchTerms ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function formatWardLabel(ward: BengaluruWard): string {
  return `${ward.locality} · ${ward.name} (${ward.zone})`;
}

export function searchWards(query: string, limit = 12): BengaluruWard[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return BENGALURU_WARDS.slice(0, limit);
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = BENGALURU_WARDS.map((ward) => {
    const haystack = wardHaystack(ward);
    const locality = ward.locality.toLowerCase();
    const name = ward.name.toLowerCase();
    let score = 0;

    if (locality === q) score += 120;
    else if (locality.startsWith(q)) score += 90;
    else if (locality.includes(q)) score += 70;

    if (name.startsWith(q)) score += 80;
    else if (name.includes(q)) score += 55;

    if (ward.zone.toLowerCase().includes(q)) score += 25;

    const wardNum = ward.name.match(/ward\s+(\d+)/i)?.[1];
    if (wardNum && (q === wardNum || q === `ward ${wardNum}`)) score += 100;

    for (const token of tokens) {
      if (haystack.includes(token)) score += 15;
    }

    return { ward, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.ward.locality.localeCompare(b.ward.locality));

  return scored.slice(0, limit).map((entry) => entry.ward);
}

export function getWardForCoordinates(lat: number, lng: number): BengaluruWard {
  let closest = BENGALURU_WARDS[0];
  let minDist = Infinity;
  for (const ward of BENGALURU_WARDS) {
    const dist = Math.sqrt(Math.pow(lat - ward.lat, 2) + Math.pow(lng - ward.lng, 2));
    if (dist < minDist) {
      minDist = dist;
      closest = ward;
    }
  }
  return closest;
}

function wardFromMatch(ward: BengaluruWard) {
  return { ward: ward.name, zone: ward.zone, locality: ward.locality };
}

/** Try to infer ward/locality from complaint or summary text */
export function extractAreaFromText(text: string): {
  ward: string;
  zone: string;
  locality: string;
} | null {
  const lower = text.toLowerCase();

  // Prefer longer locality matches first to avoid partial hits
  const byLocalityLength = [...BENGALURU_WARDS].sort(
    (a, b) => b.locality.length - a.locality.length
  );

  for (const ward of byLocalityLength) {
    const localityLower = ward.locality.toLowerCase();
    const wardNum = ward.name.match(/Ward\s+(\d+)/i)?.[1];
    if (
      lower.includes(localityLower) ||
      (wardNum && lower.includes(`ward ${wardNum}`)) ||
      lower.includes(ward.name.toLowerCase())
    ) {
      return wardFromMatch(ward);
    }
  }

  for (const [alias, locality] of Object.entries(LOCALITY_ALIASES)) {
    if (lower.includes(alias)) {
      const match = BENGALURU_WARDS.find((w) => w.locality === locality);
      if (match) {
        return wardFromMatch(match);
      }
      return {
        ward: `Area - ${locality}`,
        zone: "To be confirmed",
        locality,
      };
    }
  }

  const zoneMatch = lower.match(/\b(south|east|north|west|central)\s+zone\b/i);
  if (zoneMatch) {
    const zone = `${zoneMatch[1].charAt(0).toUpperCase()}${zoneMatch[1].slice(1).toLowerCase()} Zone`;
    return { ward: "Ward to be confirmed", zone, locality: "Area-wide issue" };
  }

  return null;
}

export function wardOptions(): string[] {
  return BENGALURU_WARDS.map((w) => formatWardLabel(w));
}

export function parseWardOption(option: string): BengaluruWard | null {
  return BENGALURU_WARDS.find((w) => formatWardLabel(w) === option) ?? null;
}

export function wardToArea(ward: BengaluruWard) {
  return {
    ward: ward.name,
    zone: ward.zone,
    locality: ward.locality,
  };
}
