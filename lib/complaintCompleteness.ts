export interface CompletenessField {
  id: string;
  label: string;
  fillHint: string;
  completed: boolean;
  weight: number;
  interactive?: boolean;
}

export interface CompletenessReport {
  score: number;
  fields: CompletenessField[];
  missing: CompletenessField[];
  completed: CompletenessField[];
}

export type SupplementalDetailId =
  | "description"
  | "ward"
  | "landmark"
  | "timeline"
  | "consumer_id";

export type SupplementalDetails = Partial<Record<SupplementalDetailId, string>>;

export const DETAIL_INPUT_CONFIG: Record<
  SupplementalDetailId,
  { placeholder: string; multiline?: boolean; label: string }
> = {
  description: {
    label: "Issue description",
    placeholder: "Describe the problem in more detail…",
    multiline: true,
  },
  ward: {
    label: "Ward / locality",
    placeholder: "e.g. Koramangala, Ward 151, Indiranagar",
  },
  landmark: {
    label: "Area or landmark",
    placeholder: "e.g. Near metro station, 10th Main Road, opposite temple",
  },
  timeline: {
    label: "When it started",
    placeholder: "e.g. For the past 3 days, since Monday morning",
  },
  consumer_id: {
    label: "Consumer / RR number",
    placeholder: "e.g. BWSSB RR No. 12345678",
  },
};

interface LocationInput {
  lat: number;
  lng: number;
  ward?: string;
  zone?: string;
  locality?: string;
  source?: string;
}

interface AreaInput {
  ward: string;
  zone: string;
  locality: string;
}

interface AssessParams {
  grievanceText: string;
  editedSummary: string;
  location: LocationInput | null;
  selectedArea: AreaInput | null;
  selectedLocalDepartments: string[];
  supplemental?: SupplementalDetails;
  aiObservation?: string;
  aiMissing?: boolean;
}

const LANDMARK_PATTERNS = [
  /\b(near|opposite|behind|beside|next to|adjacent)\b/i,
  /\b(bus stand|metro|hospital|school|temple|mall|junction|circle|chowk)\b/i,
  /\b\d+(st|nd|rd|th)\s+(main|cross|block|stage)\b/i,
  /\bmain\s+road\b/i,
  /\bstreet\s*(no\.?|number)?\s*\d+/i,
  /\bplot\s*(no\.?|#)?\s*\d+/i,
  /\b(area|stretch|locality|neighbourhood|neighborhood)\b/i,
];

const TIMELINE_PATTERNS = [
  /\b(since|for|past|last)\s+\d+\s+(day|week|month|hour)/i,
  /\b\d+\s+(days?|weeks?|months?)\s+(ago|back)/i,
  /\b(yesterday|today|this\s+morning|last\s+night)\b/i,
  /\bstarted\s+on\b/i,
];

const CONSUMER_ID_PATTERNS = [
  /\bconsumer\s*(id|no\.?|number)\b/i,
  /\brr\s*(no\.?|number)\b/i,
  /\baccount\s*(no\.?|number)\b/i,
  /\bconnection\s*(id|no\.?|number)\b/i,
  /\b(meter|rr)\s*[#:]?\s*\d{4,}/i,
];

function combinedText(
  grievanceText: string,
  editedSummary: string,
  supplemental?: SupplementalDetails
): string {
  const parts = [grievanceText, editedSummary];
  if (supplemental?.landmark) parts.push(supplemental.landmark);
  if (supplemental?.timeline) parts.push(supplemental.timeline);
  if (supplemental?.consumer_id) parts.push(`consumer id ${supplemental.consumer_id}`);
  if (supplemental?.description) parts.push(supplemental.description);
  if (supplemental?.ward) parts.push(supplemental.ward);
  return parts.join("\n").toLowerCase();
}

function hasLandmark(text: string, supplemental?: SupplementalDetails): boolean {
  if (supplemental?.landmark && supplemental.landmark.trim().length >= 4) return true;
  return LANDMARK_PATTERNS.some((p) => p.test(text));
}

function hasTimeline(text: string, supplemental?: SupplementalDetails): boolean {
  if (supplemental?.timeline && supplemental.timeline.trim().length >= 4) return true;
  return TIMELINE_PATTERNS.some((p) => p.test(text));
}

function hasConsumerId(text: string, supplemental?: SupplementalDetails): boolean {
  if (supplemental?.consumer_id && supplemental.consumer_id.trim().length >= 4) return true;
  return CONSUMER_ID_PATTERNS.some((p) => p.test(text));
}

function needsUtilityId(departments: string[]): boolean {
  return departments.some(
    (d) =>
      d.includes("BWSSB") || d.includes("BESCOM") || d.includes("Electrical")
  );
}

function areaConfirmed(
  selectedArea: AreaInput | null,
  location: LocationInput | null,
  supplemental?: SupplementalDetails
): boolean {
  if (supplemental?.ward && supplemental.ward.trim().length >= 3) return true;
  const ward = selectedArea?.ward || location?.ward;
  if (!ward) return false;
  const w = ward.toLowerCase();
  return !w.includes("to be confirmed") && !w.includes("unknown");
}

export function assessComplaintCompleteness(params: AssessParams): CompletenessReport {
  const supplemental = params.supplemental;
  const text = combinedText(params.grievanceText, params.editedSummary, supplemental);
  const utilityNeeded = needsUtilityId(params.selectedLocalDepartments);
  const fields: CompletenessField[] = [];

  fields.push({
    id: "description",
    label: "Issue description",
    fillHint: "A clear description of what is wrong and how it affects you.",
    completed:
      params.grievanceText.trim().length >= 20 ||
      Boolean(supplemental?.description && supplemental.description.trim().length >= 15),
    weight: utilityNeeded ? 25 : 28,
    interactive: true,
  });

  fields.push({
    id: "ward",
    label: "Ward & locality",
    fillHint: "Which ward or neighbourhood is affected?",
    completed: areaConfirmed(params.selectedArea, params.location, supplemental),
    weight: utilityNeeded ? 25 : 27,
    interactive: true,
  });

  fields.push({
    id: "landmark",
    label: "Area or landmark",
    fillHint:
      params.aiObservation && params.aiMissing
        ? params.aiObservation
        : "A nearby landmark or street helps crews find the spot — optional for area-wide issues.",
    completed:
      hasLandmark(text, supplemental) ||
      params.aiMissing === false ||
      areaConfirmed(params.selectedArea, params.location, supplemental),
    weight: utilityNeeded ? 15 : 17,
    interactive: true,
  });

  fields.push({
    id: "timeline",
    label: "When the issue started",
    fillHint: "How long has this problem been going on?",
    completed: hasTimeline(text, supplemental),
    weight: utilityNeeded ? 10 : 11,
    interactive: true,
  });

  fields.push({
    id: "departments",
    label: "Department routing",
    fillHint: "Select the correct department in the Routing section below.",
    completed: params.selectedLocalDepartments.length > 0,
    weight: utilityNeeded ? 15 : 17,
    interactive: false,
  });

  if (utilityNeeded) {
    fields.push({
      id: "consumer_id",
      label: "Utility consumer / RR number",
      fillHint: "Your BWSSB or BESCOM connection number helps locate your supply line.",
      completed: hasConsumerId(text, supplemental),
      weight: 10,
      interactive: true,
    });
  }

  const completed = fields.filter((f) => f.completed);
  const missing = fields.filter((f) => !f.completed);
  const score = Math.round(
    fields.reduce((sum, f) => sum + (f.completed ? f.weight : 0), 0)
  );

  return { score, fields, missing, completed };
}

export function formatSupplementalForSummary(details: SupplementalDetails): string {
  const lines: string[] = [];
  if (details.landmark?.trim()) lines.push(`Landmark/area: ${details.landmark.trim()}`);
  if (details.timeline?.trim()) lines.push(`Duration: ${details.timeline.trim()}`);
  if (details.ward?.trim()) lines.push(`Affected area: ${details.ward.trim()}`);
  if (details.consumer_id?.trim()) lines.push(`Consumer/RR No.: ${details.consumer_id.trim()}`);
  if (details.description?.trim()) lines.push(`Additional context: ${details.description.trim()}`);
  if (lines.length === 0) return "";
  return `\n\nCitizen-provided details:\n${lines.map((l) => `• ${l}`).join("\n")}`;
}
