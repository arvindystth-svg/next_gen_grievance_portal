import { extractAreaFromText } from "./bengaluruAreas";
import { isConfirmedWard } from "./geocoding";

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
    multiline: true,
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
  wardAutoFillFailed?: boolean;
}

/** Vague location phrases that should not count as landmarks. */
const VAGUE_NEAR_TARGET =
  /^(?:a|an|the)\s+(?:local\s+)?(?:\w+\s+){0,3}(?:park|road|area|spot|place|gate|corner|stretch|building|house|shop|tree|dump|bin)(?:\s+gate)?\b/i;

function trimLandmarkCandidate(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/^[,.\s;:]+|[,.\s;:]+$/g, "");
}

function isSpecificLandmarkPhrase(phrase: string): boolean {
  const trimmed = trimLandmarkCandidate(phrase);
  if (trimmed.length < 4 || trimmed.length > 200 || isGibberish(trimmed)) return false;

  if (extractAreaFromText(trimmed)) return true;
  if (/\b\d+(?:st|nd|rd|th)\s+(?:main|cross|block|stage)\b/i.test(trimmed)) return true;
  if (/\b(?:plot|street|house|building)\s*(?:no\.?|number|#)?\s*\d+/i.test(trimmed)) return true;

  if (
    /\b[A-Z][\w]*(?:\s+[A-Z][\w]*)*\s*(?:Hospital|Metro(?:\s+Station)?|Bus\s+Stand|Mall|Temple|School|College|University|Layout|Nagar|Circle|Chowk|Market|Stadium)\b/.test(
      trimmed
    )
  ) {
    return true;
  }

  const nearMatch = trimmed.match(
    /^(?:near|opposite|behind|beside|next to|adjacent to)\s+(?:the\s+)?(.+)$/i
  );
  if (nearMatch) {
    const target = nearMatch[1].trim();
    if (target.length < 3 || VAGUE_NEAR_TARGET.test(target)) return false;
    if (extractAreaFromText(target)) return true;
    if (
      /\b[A-Z]/.test(target) &&
      /\b(hospital|metro|school|temple|mall|junction|bus stand|college|layout|nagar|market|station)\b/i.test(
        target
      )
    ) {
      return true;
    }
    if (/\b\d+(?:st|nd|rd|th)\s+(?:main|cross)/i.test(target)) return true;
    return false;
  }

  if (/\b(bus stand|metro station|hospital|school|temple|mall|junction|circle|chowk)\b/i.test(trimmed)) {
    return !/\blocal\s+(?:park|road|area)\b/i.test(trimmed);
  }

  return false;
}

function isAcceptableManualLandmark(value: string): boolean {
  if (isSpecificLandmarkPhrase(value)) return true;
  const trimmed = trimLandmarkCandidate(value);
  if (trimmed.length < 6 || isGibberish(trimmed)) return false;
  if (VAGUE_NEAR_TARGET.test(trimmed)) return false;
  if (extractAreaFromText(trimmed)) return true;
  if (/\b\d+(?:st|nd|rd|th)\s+(?:main|cross|block)\b/i.test(trimmed)) return true;
  if (/\b(?:plot|street|house|building)\s*(?:no\.?|#)?\s*\d+/i.test(trimmed)) return true;
  return trimmed.split(/\s+/).filter((w) => w.length > 2).length >= 3;
}

function extractLandmarkFromText(text: string): string | null {
  const candidates: string[] = [];

  const namedFacility =
    /\b([A-Z][\w]*(?:\s+[A-Z][\w]*){0,5}\s*(?:Hospital|Metro(?:\s+Station)?|Bus\s+Stand|Mall|Temple|School|College|University|Layout|Nagar|Circle|Chowk|Market|Stadium)(?:\s+Gate)?)\b/g;
  let match: RegExpExecArray | null;
  while ((match = namedFacility.exec(text)) !== null) {
    candidates.push(trimLandmarkCandidate(match[1]));
  }

  const roads = /\b(\d+(?:st|nd|rd|th)\s+(?:Main|Cross|Block|Stage)(?:\s+Road)?)\b/gi;
  while ((match = roads.exec(text)) !== null) {
    candidates.push(trimLandmarkCandidate(match[1]));
  }

  const addressNums =
    /\b((?:plot|street|house|building)\s*(?:no\.?|number|#)?\s*\d+[\w\s,-]{0,30})/gi;
  while ((match = addressNums.exec(text)) !== null) {
    candidates.push(trimLandmarkCandidate(match[1]));
  }

  const nearPhrase =
    /\b((?:near|opposite|behind|beside|next to|adjacent to)\s+(?:the\s+)?[^.,!?;\n]{3,120})/gi;
  while ((match = nearPhrase.exec(text)) !== null) {
    candidates.push(trimLandmarkCandidate(match[1]));
  }

  const area = extractAreaFromText(text);
  if (area) {
    candidates.push(`${area.locality} · ${area.ward}`);
  }

  for (const candidate of candidates) {
    if (isSpecificLandmarkPhrase(candidate)) {
      return candidate.slice(0, 200);
    }
  }

  return null;
}

const TIMELINE_PATTERNS = [
  /\b(since|for|past|last)\s+\d+\s+(days?|weeks?|months?|hours?)\b/i,
  /\b\d+\s+(days?|weeks?|months?|hours?)\s+(ago|back)/i,
  /\b\d+\s+(days?|weeks?|months?)\b/i,
  /\b(yesterday|today|this\s+morning|last\s+night)\b/i,
  /\bstarted\s+on\b/i,
  /\b(last|past)\s+(week|month|few\s+days?)\b/i,
  /\bfor\s+(a|one|two|three|several)\s+(day|week|month)/i,
  /\b(week|month)\s+ago\b/i,
  /\brecent(ly)?\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i,
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

const PUBLIC_STREET_LIGHT_PATTERNS = [
  /\bstreet\s*lights?\b/i,
  /\bstreetlights?\b/i,
  /\bstreet\s*lamps?\b/i,
  /\blamp\s*posts?\b/i,
  /\bstreet\s*lighting\b/i,
  /\bdark\s+(street|road|area|stretch)\b/i,
  /\bnon[\s-]?functional\s+lights?\b/i,
  /\bbroken\s+street\s*lights?\b/i,
  /\bpublic\s+lighting\b/i,
  /\bpole\s*lights?\b/i,
];

const PERSONAL_UTILITY_PATTERNS = [
  /\b(my|our)\s+(home|house|flat|apartment|premises|building)\b/i,
  /\bmeter\b/i,
  /\bconsumer\b/i,
  /\brr\s*(no\.?|number)\b/i,
  /\bconnection\s*(no\.?|number|id)\b/i,
  /\baccount\s*(no\.?|number)\b/i,
  /\belectricity\s*bill\b/i,
  /\bwater\s*bill\b/i,
  /\bwater\s*connection\b/i,
];

function isGibberish(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const compact = trimmed.replace(/\s+/g, "");
  if (compact.length >= 6 && /^(.)\1+$/i.test(compact)) return true;
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 10 && !/[aeiou]/i.test(letters)) return true;
  return false;
}

function supplementalIsValid(id: SupplementalDetailId, supplemental?: SupplementalDetails): boolean {
  const val = supplemental?.[id]?.trim();
  if (!val) return false;

  switch (id) {
    case "description": {
      if (val.length < 10 || isGibberish(val)) return false;
      return val.split(/\s+/).filter(Boolean).length >= 2;
    }
    case "ward":
      if (val.length < 3 || isGibberish(val)) return false;
      return Boolean(
        extractAreaFromText(val) ||
          /\bward\s*\d+/i.test(val) ||
          /\b(locality|localities|nagar|layout|road|main|cross|block|colony|circle)\b/i.test(val) ||
          val.split(/\s+/).length >= 2
      );
    case "landmark": {
      if (val.length < 4 || isGibberish(val)) return false;
      return isAcceptableManualLandmark(val);
    }
    case "timeline":
      if (val.length < 3 || isGibberish(val)) return false;
      return TIMELINE_PATTERNS.some((p) => p.test(val));
    case "consumer_id":
      return /\d{3,}/.test(val) || CONSUMER_ID_PATTERNS.some((p) => p.test(val));
    default:
      return false;
  }
}

/** Build supplemental map used for scoring from any non-empty citizen inputs. */
export function buildScoringSupplemental(details: SupplementalDetails): SupplementalDetails {
  const result: SupplementalDetails = {};
  (Object.keys(details) as SupplementalDetailId[]).forEach((key) => {
    const val = details[key]?.trim();
    if (val) result[key] = val;
  });
  return result;
}

export type SupplementalValidationStatus = "empty" | "pending" | "valid";

export function validateSupplementalDetail(
  id: SupplementalDetailId,
  value: string
): SupplementalValidationStatus {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  return supplementalIsValid(id, { [id]: trimmed }) ? "valid" : "pending";
}

function hasLandmark(text: string, supplemental?: SupplementalDetails): boolean {
  const manual = supplemental?.landmark?.trim();
  if (manual && isAcceptableManualLandmark(manual)) return true;
  return extractLandmarkFromText(text) !== null;
}

function hasTimeline(text: string, supplemental?: SupplementalDetails): boolean {
  if (supplementalIsValid("timeline", supplemental)) return true;
  return TIMELINE_PATTERNS.some((p) => p.test(text));
}

function hasConsumerId(text: string, supplemental?: SupplementalDetails): boolean {
  if (supplementalIsValid("consumer_id", supplemental)) return true;
  return CONSUMER_ID_PATTERNS.some((p) => p.test(text));
}

function isPublicStreetLightingComplaint(text: string): boolean {
  return PUBLIC_STREET_LIGHT_PATTERNS.some((p) => p.test(text));
}

function needsUtilityId(
  departments: string[],
  grievanceText: string,
  editedSummary: string,
  supplemental?: SupplementalDetails
): boolean {
  const text = combinedText(grievanceText, editedSummary, supplemental);

  if (isPublicStreetLightingComplaint(text)) return false;

  if (departments.some((d) => d.includes("BWSSB"))) return true;

  if (departments.some((d) => d.includes("BESCOM"))) {
    return PERSONAL_UTILITY_PATTERNS.some((p) => p.test(text));
  }

  return false;
}

function areaConfirmed(
  selectedArea: AreaInput | null,
  location: LocationInput | null,
  supplemental?: SupplementalDetails
): boolean {
  if (supplementalIsValid("ward", supplemental)) return true;
  const ward = selectedArea?.ward || location?.ward;
  return isConfirmedWard(ward);
}

export function assessComplaintCompleteness(params: AssessParams): CompletenessReport {
  const supplemental = params.supplemental;
  const text = combinedText(params.grievanceText, params.editedSummary, supplemental);
  const utilityNeeded = needsUtilityId(
    params.selectedLocalDepartments,
    params.grievanceText,
    params.editedSummary,
    supplemental
  );
  const fields: CompletenessField[] = [];

  fields.push({
    id: "description",
    label: "Issue description",
    fillHint: "A clear description of what is wrong and how it affects you.",
    completed:
      params.grievanceText.trim().length >= 20 ||
      supplementalIsValid("description", supplemental),
    weight: utilityNeeded ? 25 : 28,
    interactive: true,
  });

  fields.push({
    id: "ward",
    label: "Ward & locality",
    fillHint: params.wardAutoFillFailed
      ? "We could not auto-detect your ward from the complaint. Search your ward/locality below or type it here."
      : "Which ward or neighbourhood is affected?",
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
    completed: hasLandmark(text, supplemental),
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

/** Pull missing-detail values already present in the citizen's complaint text. */
export function extractAutoFillSupplemental(
  grievanceText: string,
  editedSummary: string
): { details: SupplementalDetails; autoFilled: Partial<Record<SupplementalDetailId, boolean>> } {
  const text = `${grievanceText}\n${editedSummary}`;
  const details: SupplementalDetails = {};
  const autoFilled: Partial<Record<SupplementalDetailId, boolean>> = {};

  for (const pattern of TIMELINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const snippet = match[0].trim();
      if (snippet.length >= 3 && supplementalIsValid("timeline", { timeline: snippet })) {
        details.timeline = snippet;
        autoFilled.timeline = true;
        break;
      }
    }
  }

  const landmark = extractLandmarkFromText(text);
  if (landmark) {
    details.landmark = landmark;
    autoFilled.landmark = true;
  }

  for (const pattern of CONSUMER_ID_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const snippet = match[0].trim();
      if (supplementalIsValid("consumer_id", { consumer_id: snippet })) {
        details.consumer_id = snippet;
        autoFilled.consumer_id = true;
        break;
      }
    }
  }

  const consumerNumMatch = text.match(/\b(?:rr|consumer|account|connection)\s*(?:no\.?|number|id)?\s*[#:]?\s*(\d{4,})/i);
  if (!details.consumer_id && consumerNumMatch) {
    const snippet = consumerNumMatch[0].trim();
    details.consumer_id = snippet;
    autoFilled.consumer_id = true;
  }

  return { details, autoFilled };
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
