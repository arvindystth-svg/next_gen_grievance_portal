export interface BengaluruWard {
  name: string;
  zone: string;
  lat: number;
  lng: number;
  radius: number;
  locality: string;
}

/** Representative BBMP wards / localities for Bengaluru south & east coverage */
export const BENGALURU_WARDS: BengaluruWard[] = [
  { name: "Ward 151 - Koramangala", zone: "South Zone", lat: 12.9344, lng: 77.6251, radius: 0.025, locality: "Koramangala" },
  { name: "Ward 150 - Bellandur", zone: "East Zone", lat: 12.9279, lng: 77.6801, radius: 0.03, locality: "Bellandur" },
  { name: "Ward 80 - Hoysala Nagar", zone: "East Zone", lat: 12.9784, lng: 77.6386, radius: 0.025, locality: "Indiranagar" },
  { name: "Ward 85 - Domlur", zone: "East Zone", lat: 12.9611, lng: 77.6387, radius: 0.02, locality: "Domlur" },
  { name: "Ward 103 - Jayanagar", zone: "South Zone", lat: 12.9308, lng: 77.5836, radius: 0.025, locality: "Jayanagar" },
  { name: "Ward 69 - Shivajinagar", zone: "Central Zone", lat: 12.9867, lng: 77.6044, radius: 0.02, locality: "Shivajinagar" },
  { name: "Ward 63 - Hebbal", zone: "North Zone", lat: 13.0358, lng: 77.5973, radius: 0.025, locality: "Hebbal" },
  { name: "Ward 162 - BTM Layout", zone: "South Zone", lat: 12.9166, lng: 77.6101, radius: 0.025, locality: "BTM Layout" },
  { name: "Ward 168 - JP Nagar", zone: "South Zone", lat: 12.9068, lng: 77.5851, radius: 0.03, locality: "JP Nagar" },
  { name: "Ward 198 - Whitefield", zone: "East Zone", lat: 12.9698, lng: 77.7499, radius: 0.04, locality: "Whitefield" },
  { name: "Ward 45 - Malleshwaram", zone: "West Zone", lat: 13.0067, lng: 77.5707, radius: 0.02, locality: "Malleshwaram" },
  { name: "Ward 128 - Banashankari", zone: "South Zone", lat: 12.9255, lng: 77.5468, radius: 0.03, locality: "Banashankari" },
];

const LOCALITY_ALIASES: Record<string, string> = {
  koramangala: "Koramangala",
  bellandur: "Bellandur",
  indiranagar: "Indiranagar",
  "80 feet road": "Indiranagar",
  domlur: "Domlur",
  jayanagar: "Jayanagar",
  hebbal: "Hebbal",
  "btm": "BTM Layout",
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
};

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

/** Try to infer ward/locality from complaint or summary text */
export function extractAreaFromText(text: string): {
  ward: string;
  zone: string;
  locality: string;
} | null {
  const lower = text.toLowerCase();

  for (const ward of BENGALURU_WARDS) {
    const localityLower = ward.locality.toLowerCase();
    const wardNum = ward.name.match(/Ward\s+(\d+)/i)?.[1];
    if (
      lower.includes(localityLower) ||
      (wardNum && lower.includes(`ward ${wardNum}`)) ||
      lower.includes(ward.name.toLowerCase())
    ) {
      return { ward: ward.name, zone: ward.zone, locality: ward.locality };
    }
  }

  for (const [alias, locality] of Object.entries(LOCALITY_ALIASES)) {
    if (lower.includes(alias)) {
      const match = BENGALURU_WARDS.find((w) => w.locality === locality);
      if (match) {
        return { ward: match.name, zone: match.zone, locality: match.locality };
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
  return BENGALURU_WARDS.map((w) => `${w.name} · ${w.locality}`);
}

export function parseWardOption(option: string): BengaluruWard | null {
  const ward = BENGALURU_WARDS.find((w) => `${w.name} · ${w.locality}` === option);
  return ward ?? null;
}
