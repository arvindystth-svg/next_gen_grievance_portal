import {
  BENGALURU_WARDS,
  extractAreaFromText,
  getWardForCoordinates,
} from "@/lib/bengaluruAreas";
import { resolveDepartmentRouting } from "@/lib/departmentDetection";

export interface LocalAnalysisLocationContext {
  lat?: number;
  lng?: number;
  ward?: string;
  zone?: string;
  locality?: string;
}

export interface LocalAnalysisResult {
  summary: string;
  cpgrams_category: string;
  cpgrams_categories: string[];
  local_department: string;
  local_departments: string[];
  urgency: "HIGH" | "MEDIUM" | "LOW";
  location: {
    locality: string;
    ward: string;
    zone: string;
    latitude: number;
    longitude: number;
  };
  missing_details_advisory: {
    is_missing: boolean;
    observation: string;
    why_it_matters: string;
  };
  confidence: number;
  keywords: string[];
  suggested_actions: string[];
}

const HIGH_URGENCY = [
  /\bhospital\b/i,
  /\bambulance\b/i,
  /\bschool\b/i,
  /\bflood(?:ing)?\b/i,
  /\blive\s*wire\b/i,
  /\bexposed\s*wire\b/i,
  /\bburst\b/i,
  /\bdangerous\b/i,
  /\baccident\b/i,
  /\bemergency\b/i,
];

const LOW_URGENCY = [/\bminor\b/i, /\bsmall\b/i, /\boccasional\b/i, /\bslight\b/i];

function detectUrgency(text: string): "HIGH" | "MEDIUM" | "LOW" {
  if (HIGH_URGENCY.some((p) => p.test(text))) return "HIGH";
  if (LOW_URGENCY.some((p) => p.test(text))) return "LOW";
  return "MEDIUM";
}

function hasLandmarkOrAddress(text: string): boolean {
  return (
    /\b(?:near|opposite|beside|behind|at|in front of)\s+[a-z0-9]/i.test(text) ||
    /\b\d{1,4}(?:st|nd|rd|th)?\s+(?:main|cross|road|street)\b/i.test(text) ||
    /\bward\s+\d+\b/i.test(text)
  );
}

function buildSummary(text: string, topics: string[], locality: string): string {
  const topicPhrase =
    topics.length > 0
      ? topics.slice(0, 2).join(" and ")
      : "a civic infrastructure issue";

  const areaPhrase = locality && locality !== "Bengaluru" ? ` in ${locality}` : " in Bengaluru";

  return (
    `A citizen has reported ${topicPhrase.toLowerCase()}${areaPhrase}. ` +
    `The complaint describes: "${text.trim().slice(0, 180)}${text.trim().length > 180 ? "…" : ""}". ` +
    `The appropriate municipal department should inspect the site and initiate corrective action.`
  );
}

function extractKeywords(text: string, topics: string[]): string[] {
  const words =
    text
      .toLowerCase()
      .match(/\b[a-z][a-z-]{3,}\b/g)
      ?.filter(
        (w) =>
          !["this", "that", "with", "from", "have", "been", "very", "near"].includes(w)
      )
      .slice(0, 6) ?? [];

  return Array.from(new Set([...topics.map((t) => t.split(" ")[0]), ...words])).slice(0, 8);
}

function resolveCoordinates(
  ctx: LocalAnalysisLocationContext,
  extracted: ReturnType<typeof extractAreaFromText>
): { lat: number; lng: number } {
  if (typeof ctx.lat === "number" && typeof ctx.lng === "number") {
    return { lat: ctx.lat, lng: ctx.lng };
  }

  if (extracted?.locality) {
    const ward = BENGALURU_WARDS.find((w) => w.locality === extracted.locality);
    if (ward) return { lat: ward.lat, lng: ward.lng };
  }

  const centroid = getWardForCoordinates(12.9716, 77.5946);
  return { lat: centroid.lat, lng: centroid.lng };
}

/** Fast on-server analysis — no external API calls. */
export function localHeuristicAnalysis(
  citizenText: string,
  ctx: LocalAnalysisLocationContext
): LocalAnalysisResult {
  const routing = resolveDepartmentRouting(citizenText);
  const extracted = extractAreaFromText(citizenText);

  const locality = ctx.locality || extracted?.locality || "Bengaluru";
  const ward = ctx.ward || extracted?.ward || "Ward to be confirmed";
  const zone = ctx.zone || extracted?.zone || "To be confirmed";
  const { lat, lng } = resolveCoordinates(ctx, extracted);
  const missingLandmark = !hasLandmarkOrAddress(citizenText);

  return {
    summary: buildSummary(citizenText, routing.matched_topics, locality),
    cpgrams_category: routing.cpgrams_category,
    cpgrams_categories: routing.cpgrams_categories,
    local_department: routing.local_department,
    local_departments: routing.local_departments,
    urgency: detectUrgency(citizenText),
    location: {
      locality,
      ward,
      zone,
      latitude: lat,
      longitude: lng,
    },
    missing_details_advisory: {
      is_missing: missingLandmark,
      observation: missingLandmark
        ? "No specific landmark, street name, or ward number was mentioned."
        : "Location cues were detected in the complaint text.",
      why_it_matters:
        "Precise landmarks help field crews reach the site quickly and avoid duplicate tickets.",
    },
    confidence: routing.matched_topics.length > 0 ? 72 : 58,
    keywords: extractKeywords(citizenText, routing.matched_topics),
    suggested_actions: [
      `Assign to ${routing.local_department}`,
      "Schedule a field inspection",
      missingLandmark ? "Collect exact address or landmark from the citizen" : "Verify location on arrival",
    ],
  };
}
