export interface CompletenessField {
  id: string;
  label: string;
  fillHint: string;
  completed: boolean;
  weight: number;
}

export interface CompletenessReport {
  score: number;
  fields: CompletenessField[];
  missing: CompletenessField[];
  completed: CompletenessField[];
}

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

function combinedText(grievanceText: string, editedSummary: string): string {
  return `${grievanceText}\n${editedSummary}`.toLowerCase();
}

function hasLandmark(text: string): boolean {
  return LANDMARK_PATTERNS.some((p) => p.test(text));
}

function hasTimeline(text: string): boolean {
  return TIMELINE_PATTERNS.some((p) => p.test(text));
}

function hasConsumerId(text: string): boolean {
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
  location: LocationInput | null
): boolean {
  const ward = selectedArea?.ward || location?.ward;
  if (!ward) return false;
  const w = ward.toLowerCase();
  return !w.includes("to be confirmed") && !w.includes("unknown");
}

export function assessComplaintCompleteness(params: AssessParams): CompletenessReport {
  const text = combinedText(params.grievanceText, params.editedSummary);
  const utilityNeeded = needsUtilityId(params.selectedLocalDepartments);
  const fields: CompletenessField[] = [];

  fields.push({
    id: "description",
    label: "Issue description",
    fillHint: "Describe what is wrong, how it affects you, and any safety concerns in Step 1.",
    completed: params.grievanceText.trim().length >= 20,
    weight: utilityNeeded ? 25 : 28,
  });

  fields.push({
    id: "ward",
    label: "Ward & locality",
    fillHint:
      "Select the affected ward/locality from the dropdown, or mention the area in your summary so it auto-fills.",
    completed: areaConfirmed(params.selectedArea, params.location),
    weight: utilityNeeded ? 25 : 27,
  });

  const landmarkFromText = hasLandmark(text);
  fields.push({
    id: "landmark",
    label: "Area or landmark",
    fillHint:
      params.aiObservation && params.aiMissing
        ? params.aiObservation
        : "Mention the affected stretch, landmark, or neighbourhood — a pinpoint pin is optional for area-wide issues.",
    completed: landmarkFromText || params.aiMissing === false || areaConfirmed(params.selectedArea, params.location),
    weight: utilityNeeded ? 15 : 17,
  });

  fields.push({
    id: "timeline",
    label: "When the issue started",
    fillHint: "Mention how long the problem has lasted (e.g. 'for 3 days' or 'since Monday morning').",
    completed: hasTimeline(text),
    weight: utilityNeeded ? 10 : 11,
  });

  fields.push({
    id: "departments",
    label: "Department routing",
    fillHint: "Confirm or correct the routed departments so your ticket reaches the right team.",
    completed: params.selectedLocalDepartments.length > 0,
    weight: utilityNeeded ? 15 : 17,
  });

  // Only relevant for water / power complaints (BWSSB, BESCOM, BBMP Electrical)
  if (utilityNeeded) {
    fields.push({
      id: "consumer_id",
      label: "Utility consumer / RR number",
      fillHint:
        "Add your BWSSB or BESCOM consumer ID / RR number in the summary so the utility can locate your connection.",
      completed: hasConsumerId(text),
      weight: 10,
    });
  }

  const completed = fields.filter((f) => f.completed);
  const missing = fields.filter((f) => !f.completed);
  const score = Math.round(
    fields.reduce((sum, f) => sum + (f.completed ? f.weight : 0), 0)
  );

  return { score, fields, missing, completed };
}
